create extension if not exists pgcrypto;

create table if not exists public.owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  shop_name text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'account_type' = 'customer' then
    insert into public.customers (id, full_name, phone, shop_name, address)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.phone, ''),
      coalesce(new.raw_user_meta_data->>'shop_name', ''),
      coalesce(new.raw_user_meta_data->>'address', '')
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      phone = excluded.phone,
      shop_name = excluded.shop_name,
      address = excluded.address;
  end if;
  return new;
end;
$$;

drop trigger if exists on_customer_auth_created on auth.users;
create trigger on_customer_auth_created
after insert on auth.users
for each row execute function public.create_customer_profile();

create table if not exists public.products (
  id text primary key,
  name text not null,
  image_url text not null default '',
  description text not null default '',
  category text not null,
  price numeric(12, 2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  customer_name text not null,
  phone text not null,
  shop_name text not null,
  address text not null,
  delivery_location text,
  total numeric(12, 2) not null check (total >= 0),
  status text not null default 'Received' check (status in ('Received', 'Preparing', 'Out for delivery', 'Delivered')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  product_image text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.place_store_order(p_delivery_location text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_record public.customers%rowtype;
  product_record public.products%rowtype;
  order_id uuid := gen_random_uuid();
  requested_quantity integer;
  order_total numeric(12, 2) := 0;
  item_record jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in before placing an order';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order must contain at least one item';
  end if;

  select * into customer_record from public.customers where id = auth.uid();
  if not found then
    raise exception 'Customer profile not found';
  end if;

  for item_record in select value from jsonb_array_elements(p_items) as entry(value) loop
    requested_quantity := (item_record->>'quantity')::integer;
    if requested_quantity < 1 then
      raise exception 'Quantity must be at least one';
    end if;
    select * into product_record from public.products where id = item_record->>'product_id' for update;
    if not found then
      raise exception 'A selected product is no longer available';
    end if;
    if product_record.stock_quantity < requested_quantity then
      raise exception 'Insufficient stock for %', product_record.name;
    end if;
    order_total := order_total + product_record.price * requested_quantity;
  end loop;

  insert into public.orders (id, customer_id, customer_name, phone, shop_name, address, delivery_location, total, status)
  values (order_id, customer_record.id, customer_record.full_name, customer_record.phone, customer_record.shop_name, customer_record.address, p_delivery_location, order_total, 'Received');

  for item_record in select value from jsonb_array_elements(p_items) as entry(value) loop
    requested_quantity := (item_record->>'quantity')::integer;
    select * into product_record from public.products where id = item_record->>'product_id' for update;
    update public.products set stock_quantity = stock_quantity - requested_quantity, updated_at = now() where id = product_record.id;
    insert into public.order_items (order_id, product_id, product_name, product_image, price, quantity)
    values (order_id, product_record.id, product_record.name, product_record.image_url, product_record.price, requested_quantity);
  end loop;

  return order_id;
end;
$$;

revoke all on function public.place_store_order(text, jsonb) from public;
grant execute on function public.place_store_order(text, jsonb) to authenticated;

create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists ratings_product_idx on public.ratings(product_id);
create index if not exists complaints_created_idx on public.complaints(created_at desc);

create or replace function public.is_store_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.owners where user_id = auth.uid());
$$;

grant execute on function public.is_store_owner() to authenticated;

alter table public.owners enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ratings enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;

create policy "owners read own access" on public.owners for select to authenticated using (user_id = auth.uid());
create policy "customers read own or owner" on public.customers for select to authenticated using (id = auth.uid() or public.is_store_owner());
create policy "customers create own profile" on public.customers for insert to authenticated with check (id = auth.uid());
create policy "customers update own profile" on public.customers for update to authenticated using (id = auth.uid() or public.is_store_owner()) with check (id = auth.uid() or public.is_store_owner());
create policy "products available to catalogue" on public.products for select to anon, authenticated using (true);
create policy "owner manages products" on public.products for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());
create policy "active offers are public" on public.offers for select to anon, authenticated using (active or public.is_store_owner());
create policy "owner manages offers" on public.offers for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());
create policy "customers read own orders" on public.orders for select to authenticated using (customer_id = auth.uid() or public.is_store_owner());
create policy "customers place own orders" on public.orders for insert to authenticated with check (customer_id = auth.uid());
create policy "owner updates orders" on public.orders for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());
create policy "order item access" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.customer_id = auth.uid() or public.is_store_owner())));
create policy "customers add own order items" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid()));
create policy "ratings readable" on public.ratings for select to anon, authenticated using (true);
create policy "customers rate products" on public.ratings for insert to authenticated with check (customer_id = auth.uid());
create policy "reviews readable" on public.reviews for select to anon, authenticated using (true);
create policy "customers write reviews" on public.reviews for insert to authenticated with check (customer_id = auth.uid());
create policy "customers create complaints" on public.complaints for insert to authenticated with check (customer_id = auth.uid());
create policy "customers and owner read complaints" on public.complaints for select to authenticated using (customer_id = auth.uid() or public.is_store_owner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "product photos are public" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "owner uploads product photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_store_owner());
create policy "owner updates product photos" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_store_owner()) with check (bucket_id = 'product-images' and public.is_store_owner());
create policy "owner deletes product photos" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_store_owner());

insert into public.products (id, name, image_url, description, category, price, stock_quantity)
values
  ('p-101', 'Sooper Biscuits', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=85', 'Classic tea-time biscuits, family pack.', 'Biscuits', 120, 42),
  ('p-102', 'Crispo Potato Chips', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=85', 'Light, crunchy salted potato chips.', 'Chips', 50, 76),
  ('p-103', 'Fruit Toffee Jar', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=800&q=85', 'A colourful assortment of individually wrapped fruit toffees.', 'Toffees', 340, 18),
  ('p-104', 'Cola 1.5 L', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=85', 'Chilled-ready family bottle. Sold per bottle.', 'Cold Drinks', 190, 30),
  ('p-105', 'Milk Chocolate Bar', 'https://images.unsplash.com/photo-1548907040-4d42a0c44a3d?auto=format&fit=crop&w=800&q=85', 'Smooth milk chocolate in a handy counter-size bar.', 'Chocolates', 100, 25),
  ('p-106', 'Masala Snack Mix', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=85', 'A crisp, savoury mix with a gently spiced finish.', 'Snacks', 80, 34),
  ('p-107', 'Everyday Tea 190 g', 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=800&q=85', 'Strong, aromatic tea for everyday shop shelves.', 'Grocery', 460, 20),
  ('p-108', 'Mixed Snack Box', 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=800&q=85', 'A ready-to-display mix of customer-favourite snacks.', 'General Store', 560, 12)
on conflict (id) do nothing;
