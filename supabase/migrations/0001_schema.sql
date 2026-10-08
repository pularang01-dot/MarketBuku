-- TOKO BUKU EDUKASI — schema
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type user_role as enum ('USER','ADMIN','SUPER_ADMIN','STAFF','EDITOR','INVENTORY_MANAGER');
create type order_status as enum ('PENDING_PAYMENT','PAID','PROCESSING','PACKED','SHIPPED','DELIVERED','COMPLETED','CANCELLED','REFUNDED');
create type payment_status as enum ('PENDING','PAID','FAILED','EXPIRED','REFUNDED');
create type book_format as enum ('PRINT','EBOOK','MODULE');
create type content_status as enum ('DRAFT','PUBLISHED','ARCHIVED');
create type review_status as enum ('PENDING','APPROVED','HIDDEN');
create type discount_type as enum ('PERCENT','FIXED','FREE_SHIPPING');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_url text,
  role user_role not null default 'USER',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger trg_profiles_upd before update on profiles for each row execute function set_updated_at();

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into user_preferences(user_id) values (new.id);
  return new;
end $$;

create table user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  education_level_slug text, grade_slug text,
  subject_slugs text[] not null default '{}', interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipient_name text not null, phone text not null,
  province text not null, city text not null, district text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  address_line text not null, is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on addresses(user_id);

-- taxonomy
create table education_levels (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, sort int not null default 0);
create table grades (id uuid primary key default gen_random_uuid(), level_id uuid references education_levels(id), name text not null, slug text not null unique, sort int not null default 0);
create table subjects (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique);
create table categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text);
create table authors (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, bio text);
create table publishers (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique);

-- books
create table books (
  id uuid primary key default gen_random_uuid(),
  title text not null, slug text not null unique,
  isbn text unique check (isbn is null or isbn ~ '^(97[89])?[0-9]{9}[0-9Xx]$'),
  description text not null default '',
  author_id uuid references authors(id), publisher_id uuid references publishers(id),
  publication_year int check (publication_year between 1900 and 2100),
  pages int check (pages > 0), language text not null default 'Indonesia',
  format book_format not null default 'PRINT',
  weight_gram int not null default 300 check (weight_gram >= 0), dimensions text,
  price int not null check (price >= 0),
  sale_price int check (sale_price is null or (sale_price >= 0 and sale_price <= price)),
  cover_url text, gallery text[] not null default '{}',
  education_level_id uuid references education_levels(id), grade_id uuid references grades(id),
  keywords text[] not null default '{}', audience text, topics text[] not null default '{}',
  status content_status not null default 'DRAFT', featured boolean not null default false,
  rating_avg numeric(3,2) not null default 0, rating_count int not null default 0,
  sold_count int not null default 0,
  search_text text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger trg_books_upd before update on books for each row execute function set_updated_at();
create index books_status_idx on books(status, created_at desc);
create index books_search_trgm on books using gin (search_text gin_trgm_ops);
create index books_grade_idx on books(grade_id);
create index books_level_idx on books(education_level_id);
create index books_price_idx on books(price);

create or replace function books_fill_search() returns trigger language plpgsql as $$
declare a text; p text;
begin
  select name into a from authors where id = new.author_id;
  select name into p from publishers where id = new.publisher_id;
  new.search_text = lower(concat_ws(' ', new.title, new.isbn, a, p, new.description, array_to_string(new.keywords,' '), array_to_string(new.topics,' ')));
  return new;
end $$;
create trigger trg_books_search before insert or update on books for each row execute function books_fill_search();

create table book_categories (book_id uuid references books(id) on delete cascade, category_id uuid references categories(id) on delete cascade, primary key(book_id, category_id));
create table book_subjects (book_id uuid references books(id) on delete cascade, subject_id uuid references subjects(id) on delete cascade, primary key(book_id, subject_id));
create index on book_categories(category_id);
create index on book_subjects(subject_id);

-- inventory
create table inventory (
  book_id uuid primary key references books(id) on delete cascade,
  stock int not null default 0 check (stock >= 0),
  reserved int not null default 0 check (reserved >= 0),
  low_stock_threshold int not null default 5,
  check (reserved <= stock),
  updated_at timestamptz not null default now()
);
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  type text not null check (type in ('purchase','reserve','release','adjustment','return','cancellation','restock')),
  delta_stock int not null default 0, delta_reserved int not null default 0,
  note text, order_id uuid, actor_id uuid, created_at timestamptz not null default now()
);
create index on inventory_movements(book_id, created_at desc);

create or replace function books_create_inventory() returns trigger language plpgsql as $$
begin insert into inventory(book_id) values (new.id) on conflict do nothing; return new; end $$;
create trigger trg_books_inv after insert on books for each row execute function books_create_inventory();

-- cart / wishlist
create table cart_items (
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  quantity int not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create table wishlist_items (
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  price_at_add int, created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- promotions
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  type discount_type not null, value int not null default 0 check (value >= 0),
  min_purchase int not null default 0, max_discount int,
  starts_at timestamptz, ends_at timestamptz,
  usage_limit int, per_user_limit int not null default 1,
  used_count int not null default 0, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id), user_id uuid not null references profiles(id),
  order_id uuid not null, created_at timestamptz not null default now()
);
create index on coupon_usages(coupon_id, user_id);
create table promotions (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  description text, banner_url text, starts_at timestamptz, ends_at timestamptz,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table bundles (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  description text, price int not null check (price >= 0), cover_url text,
  status content_status not null default 'DRAFT', created_at timestamptz not null default now()
);
create table bundle_items (bundle_id uuid references bundles(id) on delete cascade, book_id uuid references books(id) on delete cascade, quantity int not null default 1, primary key(bundle_id, book_id));

-- orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references profiles(id),
  status order_status not null default 'PENDING_PAYMENT',
  subtotal int not null, discount int not null default 0, shipping_cost int not null default 0, total int not null check (total >= 0),
  coupon_code text, shipping_courier text, shipping_service text,
  shipping_address jsonb not null, has_physical boolean not null default true,
  expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger trg_orders_upd before update on orders for each row execute function set_updated_at();
create index on orders(user_id, created_at desc);
create index on orders(status);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  book_id uuid not null references books(id),
  title_snapshot text not null, price_snapshot int not null, quantity int not null check (quantity > 0),
  format_snapshot book_format not null
);
create index on order_items(order_id);
create index on order_items(book_id);
create table order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  from_status order_status, to_status order_status not null, note text, actor_id uuid, created_at timestamptz not null default now()
);
create table payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  provider text not null, provider_txn_id text, status payment_status not null default 'PENDING',
  amount int not null, redirect_url text, raw jsonb, paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider, provider_txn_id)
);
create trigger trg_pay_upd before update on payments for each row execute function set_updated_at();
create table payment_webhook_events (
  id text primary key, provider text not null, payload jsonb, received_at timestamptz not null default now()
);
create table shipments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references orders(id) on delete cascade,
  courier text, service text, tracking_number text, shipped_at timestamptz, delivered_at timestamptz
);

-- reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5), body text not null check (char_length(body) between 10 and 2000),
  status review_status not null default 'PENDING', created_at timestamptz not null default now(),
  unique (book_id, user_id)
);
create table review_images (id uuid primary key default gen_random_uuid(), review_id uuid not null references reviews(id) on delete cascade, path text not null);

-- digital
create table digital_products (book_id uuid primary key references books(id) on delete cascade, storage_path text not null, file_size bigint, page_count int);
create table digital_entitlements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade, order_id uuid references orders(id),
  created_at timestamptz not null default now(), unique (user_id, book_id)
);
create table reading_progress (user_id uuid references profiles(id) on delete cascade, book_id uuid references books(id) on delete cascade, page int not null default 1, updated_at timestamptz not null default now(), primary key(user_id, book_id));

-- misc
create table notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('order','payment','shipping','promotion','wishlist','restock','recommendation')),
  title text not null, body text, link text, read boolean not null default false, created_at timestamptz not null default now()
);
create index on notifications(user_id, created_at desc);
create table user_events (
  id bigserial primary key, user_id uuid references profiles(id) on delete cascade, session_id text,
  type text not null check (type in ('view_book','search','wishlist','add_to_cart','purchase','review')),
  book_id uuid references books(id) on delete set null, meta jsonb, created_at timestamptz not null default now()
);
create index on user_events(user_id, created_at desc);
create index on user_events(book_id, type, created_at desc);
create table articles (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, excerpt text,
  content text not null default '', cover_url text, author_name text, category text,
  status content_status not null default 'DRAFT', published_at timestamptz,
  seo_title text, seo_description text, related_book_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity text not null, entity_id text,
  metadata jsonb, created_at timestamptz not null default now()
);
create index on audit_logs(created_at desc);
create table site_settings (key text primary key, value jsonb not null);
