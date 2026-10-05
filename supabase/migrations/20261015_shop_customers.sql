-- Customers and boats on file for each shop. Work orders pick a boat from this list
-- instead of free-typing; the label/customer strings stay on the order for QuickBooks.

create table if not exists public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_customers_vendor_idx on public.shop_customers(vendor_id, name);

create table if not exists public.shop_boats (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  customer_id uuid not null references public.shop_customers(id) on delete cascade,
  name text not null default '',
  year int,
  make text not null default '',
  model text not null default '',
  engine text not null default '',
  hull_id text not null default '',
  slip text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_boats_vendor_idx on public.shop_boats(vendor_id, customer_id);

alter table public.shop_work_orders add column if not exists boat_id uuid references public.shop_boats(id) on delete set null;

alter table public.shop_customers enable row level security;
alter table public.shop_boats enable row level security;

drop policy if exists "Shop manages customers" on public.shop_customers;
create policy "Shop manages customers" on public.shop_customers
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

drop policy if exists "Shop manages boats" on public.shop_boats;
create policy "Shop manages boats" on public.shop_boats
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

-- Techs read the list (to see who a boat belongs to); managers run it like the board.
drop policy if exists "Crew reads customers" on public.shop_customers;
create policy "Crew reads customers" on public.shop_customers
  for select to authenticated using (public.is_shop_tech(vendor_id, null));
drop policy if exists "Crew reads boats" on public.shop_boats;
create policy "Crew reads boats" on public.shop_boats
  for select to authenticated using (public.is_shop_tech(vendor_id, null));
drop policy if exists "Managers run customers" on public.shop_customers;
create policy "Managers run customers" on public.shop_customers
  for all to authenticated
  using (public.is_shop_manager(vendor_id)) with check (public.is_shop_manager(vendor_id));
drop policy if exists "Managers run boats" on public.shop_boats;
create policy "Managers run boats" on public.shop_boats
  for all to authenticated
  using (public.is_shop_manager(vendor_id)) with check (public.is_shop_manager(vendor_id));

-- Backfill: one customer per distinct name already on a shop's work orders, one boat per label.
insert into public.shop_customers (vendor_id, name, email)
select vendor_id, trim(customer_name), coalesce(max(nullif(customer_email, '')), '')
from public.shop_work_orders
where trim(customer_name) <> ''
group by vendor_id, trim(customer_name)
on conflict do nothing;

insert into public.shop_boats (vendor_id, customer_id, name)
select distinct w.vendor_id, c.id, trim(w.boat_label)
from public.shop_work_orders w
join public.shop_customers c on c.vendor_id = w.vendor_id and c.name = trim(w.customer_name)
where trim(w.boat_label) <> ''
  and not exists (
    select 1 from public.shop_boats b
    where b.vendor_id = w.vendor_id and b.customer_id = c.id and b.name = trim(w.boat_label)
  );

update public.shop_work_orders w
set boat_id = b.id
from public.shop_boats b
join public.shop_customers c on c.id = b.customer_id
where w.boat_id is null
  and b.vendor_id = w.vendor_id
  and c.name = trim(w.customer_name)
  and b.name = trim(w.boat_label);
