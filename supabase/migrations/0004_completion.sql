-- 0004: bundles at checkout, refunds/restock, bookmarks, notifications, search refresh

alter table orders add column if not exists bundle_discount int not null default 0;

create table if not exists reading_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  page int not null check (page > 0), label text,
  created_at timestamptz not null default now()
);
create index if not exists reading_bookmarks_idx on reading_bookmarks(user_id, book_id);
alter table reading_bookmarks enable row level security;
create policy "own bookmarks" on reading_bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- keep books.search_text fresh when author/publisher is renamed
create or replace function refresh_books_search() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'authors' then update books set title = title where author_id = new.id;
  else update books set title = title where publisher_id = new.id; end if;
  return new;
end $$;
drop trigger if exists trg_authors_search on authors;
create trigger trg_authors_search after update of name on authors for each row execute function refresh_books_search();
drop trigger if exists trg_publishers_search on publishers;
create trigger trg_publishers_search after update of name on publishers for each row execute function refresh_books_search();

-- price drop / restock notifications for wishlist users
create or replace function notify_price_drop() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'PUBLISHED' and coalesce(new.sale_price, new.price) < coalesce(old.sale_price, old.price) then
    insert into notifications(user_id, type, title, body, link)
    select user_id, 'wishlist', 'Harga turun: ' || new.title, 'Buku di wishlist-mu kini lebih murah.', '/books/' || new.slug
    from wishlist_items where book_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_books_price_drop on books;
create trigger trg_books_price_drop after update of price, sale_price on books for each row execute function notify_price_drop();

create or replace function notify_restock() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; s text;
begin
  if (old.stock - old.reserved) <= 0 and (new.stock - new.reserved) > 0 then
    select title, slug into t, s from books where id = new.book_id;
    insert into notifications(user_id, type, title, body, link)
    select user_id, 'restock', 'Stok tersedia lagi: ' || t, 'Buku di wishlist-mu sudah tersedia kembali.', '/books/' || s
    from wishlist_items where book_id = new.book_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_inventory_restock on inventory;
create trigger trg_inventory_restock after update of stock, reserved on inventory for each row execute function notify_restock();

-- create_order v2: adds best-bundle discount (single best bundle, applied per complete set)
create or replace function create_order(
  p_user uuid, p_items jsonb, p_address jsonb,
  p_shipping_cost int, p_courier text, p_service text, p_coupon text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  it record; b record; v_book books%rowtype; v_inv inventory%rowtype;
  v_subtotal int := 0; v_bundle int := 0; v_cand int; v_sets int; v_normal int;
  v_discount int := 0; v_ship int := p_shipping_cost; v_total int; v_base int;
  v_has_physical boolean := false; v_order uuid := gen_random_uuid(); v_number text;
  v_coupon coupons%rowtype; v_user_used int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  for it in select (x->>'book_id')::uuid as book_id, (x->>'quantity')::int as qty
            from jsonb_array_elements(p_items) x order by 1 loop
    if it.qty < 1 or it.qty > 99 then raise exception 'INVALID_QTY'; end if;
    select * into v_book from books where id = it.book_id and status = 'PUBLISHED';
    if not found then raise exception 'BOOK_UNAVAILABLE:%', it.book_id; end if;
    if v_book.format = 'PRINT' then
      v_has_physical := true;
      select * into v_inv from inventory where book_id = it.book_id for update;
      if (v_inv.stock - v_inv.reserved) < it.qty then raise exception 'INSUFFICIENT_STOCK:%', v_book.title; end if;
      update inventory set reserved = reserved + it.qty, updated_at = now() where book_id = it.book_id;
    end if;
    v_subtotal := v_subtotal + coalesce(v_book.sale_price, v_book.price) * it.qty;
  end loop;

  -- best single bundle
  for b in select id, price from bundles where status = 'PUBLISHED' loop
    select min(floor(coalesce(c.qty, 0) / bi.quantity)) into v_sets
    from bundle_items bi
    left join (select (x->>'book_id')::uuid as bid, sum((x->>'quantity')::int) as qty from jsonb_array_elements(p_items) x group by 1) c on c.bid = bi.book_id
    where bi.bundle_id = b.id;
    if coalesce(v_sets, 0) > 0 then
      select sum(coalesce(bk.sale_price, bk.price) * bi.quantity) into v_normal
      from bundle_items bi join books bk on bk.id = bi.book_id where bi.bundle_id = b.id;
      v_cand := greatest(v_normal - b.price, 0) * v_sets;
      if v_cand > v_bundle then v_bundle := v_cand; end if;
    end if;
  end loop;
  v_bundle := least(v_bundle, v_subtotal);
  v_base := v_subtotal - v_bundle;

  if not v_has_physical then v_ship := 0; end if;

  if p_coupon is not null and p_coupon <> '' then
    select * into v_coupon from coupons where code = upper(p_coupon) for update;
    if not found or not v_coupon.active then raise exception 'COUPON_INVALID'; end if;
    if v_coupon.starts_at is not null and now() < v_coupon.starts_at then raise exception 'COUPON_NOT_STARTED'; end if;
    if v_coupon.ends_at is not null and now() > v_coupon.ends_at then raise exception 'COUPON_EXPIRED'; end if;
    if v_base < v_coupon.min_purchase then raise exception 'COUPON_MIN_PURCHASE'; end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then raise exception 'COUPON_EXHAUSTED'; end if;
    select count(*) into v_user_used from coupon_usages where coupon_id = v_coupon.id and user_id = p_user;
    if v_user_used >= v_coupon.per_user_limit then raise exception 'COUPON_USER_LIMIT'; end if;
    if v_coupon.type = 'PERCENT' then
      v_discount := floor(v_base * least(v_coupon.value, 100) / 100.0);
      if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
    elsif v_coupon.type = 'FIXED' then v_discount := least(v_coupon.value, v_base);
    else v_discount := 0; v_ship := 0; end if;
    update coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_total := greatest(v_base - v_discount, 0) + v_ship;
  v_number := 'TBE-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_order::text, '-', ''), 1, 6));

  insert into orders(id, order_number, user_id, subtotal, bundle_discount, discount, shipping_cost, total, coupon_code, shipping_courier, shipping_service, shipping_address, has_physical, expires_at)
  values (v_order, v_number, p_user, v_subtotal, v_bundle, v_discount, v_ship, v_total, nullif(upper(p_coupon), ''), p_courier, p_service, p_address, v_has_physical, now() + interval '24 hours');

  insert into order_items(order_id, book_id, title_snapshot, price_snapshot, quantity, format_snapshot)
  select v_order, bk.id, bk.title, coalesce(bk.sale_price, bk.price), (x->>'quantity')::int, bk.format
  from jsonb_array_elements(p_items) x join books bk on bk.id = (x->>'book_id')::uuid;

  insert into inventory_movements(book_id, type, delta_reserved, order_id, actor_id, note)
  select bk.id, 'reserve', (x->>'quantity')::int, v_order, p_user, 'order reserve'
  from jsonb_array_elements(p_items) x join books bk on bk.id = (x->>'book_id')::uuid where bk.format = 'PRINT';

  if v_coupon.id is not null then insert into coupon_usages(coupon_id, user_id, order_id) values (v_coupon.id, p_user, v_order); end if;
  insert into order_events(order_id, to_status, note, actor_id) values (v_order, 'PENDING_PAYMENT', 'order created', p_user);
  delete from cart_items where user_id = p_user;
  return v_order;
end $$;

-- Reverse a PAID(+) order: cancel/refund. Restocks only items that have not shipped.
create or replace function reverse_paid_order(p_order uuid, p_actor uuid, p_new order_status, p_note text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; it record; v_restock boolean;
begin
  if p_new not in ('CANCELLED', 'REFUNDED') then raise exception 'INVALID_TARGET'; end if;
  select * into o from orders where id = p_order for update;
  if not found or o.status in ('PENDING_PAYMENT', 'CANCELLED', 'REFUNDED') then return false; end if;
  v_restock := o.status in ('PAID', 'PROCESSING', 'PACKED');   -- not yet shipped => goods are still in the warehouse
  for it in select book_id, quantity, format_snapshot from order_items where order_id = p_order loop
    if it.format_snapshot = 'PRINT' and v_restock then
      update inventory set stock = stock + it.quantity, updated_at = now() where book_id = it.book_id;
      insert into inventory_movements(book_id, type, delta_stock, order_id, actor_id, note) values (it.book_id, 'cancellation', it.quantity, p_order, p_actor, p_note);
    end if;
    if it.format_snapshot <> 'PRINT' then delete from digital_entitlements where user_id = o.user_id and book_id = it.book_id and order_id = p_order; end if;
    update books set sold_count = greatest(sold_count - it.quantity, 0) where id = it.book_id;
  end loop;
  update payments set status = 'REFUNDED' where order_id = p_order and status = 'PAID';
  update orders set status = p_new where id = p_order;
  insert into order_events(order_id, from_status, to_status, note, actor_id) values (p_order, o.status, p_new, p_note, p_actor);
  insert into notifications(user_id, type, title, body, link) values (o.user_id, 'payment', 'Pesanan ' || o.order_number || ' ' || case when p_new = 'REFUNDED' then 'dikembalikan dananya' else 'dibatalkan' end, p_note, '/orders/' || p_order);
  return true;
end $$;

revoke all on function reverse_paid_order from public, anon, authenticated;
grant execute on function reverse_paid_order to service_role;

-- schedule stale-order expiry with pg_cron if the extension is available (Supabase: enable "pg_cron" in Database > Extensions)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-stale-orders', '*/15 * * * *', 'select expire_stale_orders()');
  end if;
end $$;
