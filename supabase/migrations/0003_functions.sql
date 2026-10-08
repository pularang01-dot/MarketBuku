-- ATOMIC BUSINESS FUNCTIONS (callable only with the service role)

create or replace function create_order(
  p_user uuid, p_items jsonb, p_address jsonb,
  p_shipping_cost int, p_courier text, p_service text, p_coupon text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  it record; v_book books%rowtype; v_inv inventory%rowtype;
  v_subtotal int := 0; v_discount int := 0; v_ship int := p_shipping_cost; v_total int;
  v_has_physical boolean := false; v_order uuid := gen_random_uuid(); v_number text;
  v_coupon coupons%rowtype; v_used int; v_user_used int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  -- lock inventory rows in deterministic order to avoid deadlocks
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

  if not v_has_physical then v_ship := 0; end if;

  if p_coupon is not null and p_coupon <> '' then
    select * into v_coupon from coupons where code = upper(p_coupon) for update;
    if not found or not v_coupon.active then raise exception 'COUPON_INVALID'; end if;
    if v_coupon.starts_at is not null and now() < v_coupon.starts_at then raise exception 'COUPON_NOT_STARTED'; end if;
    if v_coupon.ends_at is not null and now() > v_coupon.ends_at then raise exception 'COUPON_EXPIRED'; end if;
    if v_subtotal < v_coupon.min_purchase then raise exception 'COUPON_MIN_PURCHASE'; end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then raise exception 'COUPON_EXHAUSTED'; end if;
    select count(*) into v_user_used from coupon_usages where coupon_id = v_coupon.id and user_id = p_user;
    if v_user_used >= v_coupon.per_user_limit then raise exception 'COUPON_USER_LIMIT'; end if;
    if v_coupon.type = 'PERCENT' then
      v_discount := floor(v_subtotal * least(v_coupon.value,100) / 100.0);
      if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
    elsif v_coupon.type = 'FIXED' then v_discount := least(v_coupon.value, v_subtotal);
    else v_discount := 0; v_ship := 0; end if;
    update coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + v_ship;
  v_number := 'TBE-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(v_order::text,'-',''),1,6));

  insert into orders(id, order_number, user_id, subtotal, discount, shipping_cost, total, coupon_code, shipping_courier, shipping_service, shipping_address, has_physical, expires_at)
  values (v_order, v_number, p_user, v_subtotal, v_discount, v_ship, v_total, nullif(upper(p_coupon),''), p_courier, p_service, p_address, v_has_physical, now() + interval '24 hours');

  insert into order_items(order_id, book_id, title_snapshot, price_snapshot, quantity, format_snapshot)
  select v_order, b.id, b.title, coalesce(b.sale_price, b.price), (x->>'quantity')::int, b.format
  from jsonb_array_elements(p_items) x join books b on b.id = (x->>'book_id')::uuid;

  insert into inventory_movements(book_id, type, delta_reserved, order_id, actor_id, note)
  select b.id, 'reserve', (x->>'quantity')::int, v_order, p_user, 'order reserve'
  from jsonb_array_elements(p_items) x join books b on b.id = (x->>'book_id')::uuid where b.format = 'PRINT';

  if v_coupon.id is not null then insert into coupon_usages(coupon_id, user_id, order_id) values (v_coupon.id, p_user, v_order); end if;
  insert into order_events(order_id, to_status, note, actor_id) values (v_order, 'PENDING_PAYMENT', 'order created', p_user);
  delete from cart_items where user_id = p_user;
  return v_order;
end $$;

create or replace function mark_order_paid(p_order uuid, p_provider text, p_txn text, p_amount int, p_raw jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; it record;
begin
  select * into o from orders where id = p_order for update;
  if not found then return 'NOT_FOUND'; end if;
  if o.status <> 'PENDING_PAYMENT' then return 'ALREADY_PROCESSED'; end if;   -- idempotent
  if o.total <> p_amount then return 'AMOUNT_MISMATCH'; end if;

  update orders set status = 'PAID' where id = p_order;
  update payments set status = 'PAID', paid_at = now(), provider_txn_id = coalesce(p_txn, provider_txn_id), raw = p_raw
    where order_id = p_order and provider = p_provider;
  insert into order_events(order_id, from_status, to_status, note) values (p_order, 'PENDING_PAYMENT', 'PAID', 'payment confirmed via webhook');

  for it in select oi.book_id, oi.quantity, oi.format_snapshot from order_items oi where oi.order_id = p_order loop
    if it.format_snapshot = 'PRINT' then
      update inventory set stock = stock - it.quantity, reserved = reserved - it.quantity, updated_at = now() where book_id = it.book_id;
      insert into inventory_movements(book_id, type, delta_stock, delta_reserved, order_id, note) values (it.book_id, 'purchase', -it.quantity, -it.quantity, p_order, 'sold');
    else
      insert into digital_entitlements(user_id, book_id, order_id) values (o.user_id, it.book_id, p_order) on conflict (user_id, book_id) do nothing;
    end if;
    update books set sold_count = sold_count + it.quantity where id = it.book_id;
    insert into user_events(user_id, type, book_id) values (o.user_id, 'purchase', it.book_id);
  end loop;

  insert into notifications(user_id, type, title, body, link) values (o.user_id, 'payment', 'Pembayaran diterima', 'Pesanan ' || o.order_number || ' sedang kami proses.', '/orders/' || p_order);
  return 'OK';
end $$;

create or replace function cancel_pending_order(p_order uuid, p_actor uuid, p_note text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; it record;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.status <> 'PENDING_PAYMENT' then return false; end if;
  update orders set status = 'CANCELLED' where id = p_order;
  update payments set status = 'EXPIRED' where order_id = p_order and status = 'PENDING';
  for it in select book_id, quantity from order_items where order_id = p_order and format_snapshot = 'PRINT' loop
    update inventory set reserved = reserved - it.quantity, updated_at = now() where book_id = it.book_id;
    insert into inventory_movements(book_id, type, delta_reserved, order_id, actor_id, note) values (it.book_id, 'cancellation', -it.quantity, p_order, p_actor, p_note);
  end loop;
  if o.coupon_code is not null then
    delete from coupon_usages where order_id = p_order;
    update coupons set used_count = greatest(used_count - 1, 0) where code = o.coupon_code;
  end if;
  insert into order_events(order_id, from_status, to_status, note, actor_id) values (p_order, 'PENDING_PAYMENT', 'CANCELLED', p_note, p_actor);
  return true;
end $$;

create or replace function expire_stale_orders() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from orders where status = 'PENDING_PAYMENT' and expires_at < now() loop
    if cancel_pending_order(r.id, null, 'expired') then n := n + 1; end if;
  end loop;
  return n;
end $$;

create or replace function adjust_stock(p_book uuid, p_delta int, p_type text, p_actor uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v inventory%rowtype;
begin
  select * into v from inventory where book_id = p_book for update;
  if not found then raise exception 'NO_INVENTORY'; end if;
  if v.stock + p_delta < v.reserved then raise exception 'STOCK_BELOW_RESERVED'; end if;
  update inventory set stock = stock + p_delta, updated_at = now() where book_id = p_book;
  insert into inventory_movements(book_id, type, delta_stock, actor_id, note) values (p_book, p_type, p_delta, p_actor, p_note);
end $$;

-- aggregate rating
create or replace function refresh_book_rating(p_book uuid) returns void language sql security definer set search_path = public as $$
  update books set rating_avg = coalesce((select round(avg(rating)::numeric,2) from reviews where book_id = p_book and status='APPROVED'),0),
                   rating_count = (select count(*) from reviews where book_id = p_book and status='APPROVED')
  where id = p_book;
$$;
create or replace function trg_reviews_rating() returns trigger language plpgsql security definer set search_path = public as $$
begin perform refresh_book_rating(coalesce(new.book_id, old.book_id)); return null; end $$;
create trigger reviews_rating after insert or update or delete on reviews for each row execute function trg_reviews_rating();

revoke all on function create_order, mark_order_paid, cancel_pending_order, expire_stale_orders, adjust_stock, refresh_book_rating from public, anon, authenticated;
grant execute on function create_order, mark_order_paid, cancel_pending_order, expire_stale_orders, adjust_stock, refresh_book_rating to service_role;
