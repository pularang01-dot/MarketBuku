-- ROW LEVEL SECURITY
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('ADMIN','SUPER_ADMIN'));
$$;

create or replace function has_purchased(p_book uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from order_items oi join orders o on o.id = oi.order_id
    where o.user_id = auth.uid() and oi.book_id = p_book
      and o.status in ('PAID','PROCESSING','PACKED','SHIPPED','DELIVERED','COMPLETED')
  );
$$;

-- prevent users from escalating their own role
create or replace function profiles_guard_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(),'') <> 'service_role' and not is_admin() then
    raise exception 'role change not allowed';
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before update on profiles for each row execute function profiles_guard_role();

do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences','addresses','education_levels','grades','subjects','categories','authors','publishers','books','book_categories','book_subjects','inventory','inventory_movements','cart_items','wishlist_items','coupons','coupon_usages','promotions','bundles','bundle_items','orders','order_items','order_events','payments','payment_webhook_events','shipments','reviews','review_images','digital_products','digital_entitlements','reading_progress','notifications','user_events','articles','audit_logs','site_settings']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- public read: taxonomy
do $$
declare t text;
begin
  foreach t in array array['education_levels','grades','subjects','categories','authors','publishers','book_categories','book_subjects']
  loop
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

create policy "public read published books" on books for select using (status = 'PUBLISHED' or is_admin());
create policy "admin write books" on books for all using (is_admin()) with check (is_admin());
create policy "public read inventory" on inventory for select using (true);
create policy "admin inventory" on inventory for all using (is_admin()) with check (is_admin());
create policy "admin movements" on inventory_movements for select using (is_admin());

create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own prefs" on user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cart" on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist" on wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: read-only for users; all writes go through SECURITY DEFINER RPCs / service role
create policy "own orders read" on orders for select using (user_id = auth.uid() or is_admin());
create policy "own order items read" on order_items for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "own order events read" on order_events for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "own payments read" on payments for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "own shipments read" on shipments for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "admin shipments" on shipments for all using (is_admin()) with check (is_admin());

-- reviews
create policy "read approved reviews" on reviews for select using (status = 'APPROVED' or user_id = auth.uid() or is_admin());
create policy "insert eligible review" on reviews for insert with check (user_id = auth.uid() and status = 'PENDING' and has_purchased(book_id));
create policy "update own pending review" on reviews for update using (user_id = auth.uid() and status = 'PENDING') with check (user_id = auth.uid() and status = 'PENDING');
create policy "admin moderate reviews" on reviews for all using (is_admin()) with check (is_admin());
create policy "read review images" on review_images for select using (true);
create policy "own review images" on review_images for insert with check (exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid()));

-- promos
create policy "public active promos" on promotions for select using (active or is_admin());
create policy "admin promos" on promotions for all using (is_admin()) with check (is_admin());
create policy "public bundles" on bundles for select using (status = 'PUBLISHED' or is_admin());
create policy "admin bundles" on bundles for all using (is_admin()) with check (is_admin());
create policy "public bundle items" on bundle_items for select using (true);
create policy "admin bundle items" on bundle_items for all using (is_admin()) with check (is_admin());
create policy "admin coupons" on coupons for all using (is_admin()) with check (is_admin());
create policy "own coupon usage" on coupon_usages for select using (user_id = auth.uid() or is_admin());

-- digital (digital_products is admin-only: storage path is never exposed to clients)
create policy "admin digital" on digital_products for all using (is_admin()) with check (is_admin());
create policy "own entitlements" on digital_entitlements for select using (user_id = auth.uid() or is_admin());
create policy "own progress" on reading_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "own notifications update" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own events insert" on user_events for insert with check (user_id = auth.uid());
create policy "own events read" on user_events for select using (user_id = auth.uid() or is_admin());

create policy "public articles" on articles for select using (status = 'PUBLISHED' or is_admin());
create policy "admin articles" on articles for all using (is_admin()) with check (is_admin());
create policy "admin audit read" on audit_logs for select using (is_admin());
create policy "admin settings" on site_settings for all using (is_admin()) with check (is_admin());
-- payment_webhook_events: no policies => service role only.

-- STORAGE buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('covers','covers',true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('review-images','review-images',true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('articles','articles',true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('digital','digital',false, 104857600, array['application/pdf'])
on conflict (id) do nothing;
create policy "public read covers" on storage.objects for select using (bucket_id in ('covers','review-images','articles'));
-- bucket 'digital' has NO policies: only service role (signed URLs created server-side after entitlement check).
-- uploads to public buckets go through server actions using the service role after admin check.
