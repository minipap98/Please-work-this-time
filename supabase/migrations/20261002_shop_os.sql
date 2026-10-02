-- Shop OS: work orders, schedule, real-time inventory, inbound parts tracking,
-- and a verified boat logbook for owners.
-- Run after 20260826_vendor_loop.sql

-- ============================================================
-- Shop settings (private; vendor_profiles is publicly readable)
-- inbound_email_token routes parts+<token>@<INBOUND_EMAIL_DOMAIN> to the shop
-- ============================================================
create table if not exists public.shop_settings (
  vendor_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  inbound_email_token text not null unique
    default lower(substr(md5(gen_random_uuid()::text), 1, 16)),
  labor_rate numeric not null default 145,
  tax_rate numeric not null default 0,
  bays text[] not null default '{"Bay 1","Bay 2","Haul-out","Dockside"}',
  techs text[] not null default '{}',
  qb_labor_item text not null default 'Marine Labor',
  qb_parts_item text not null default 'Marine Parts',
  qb_fee_item text not null default 'Shop Fees',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Inventory
-- ============================================================
create table if not exists public.shop_inventory (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  sku text not null default '',
  name text not null,
  category text not null default '',
  bin_location text not null default '',
  qty_on_hand numeric not null default 0,
  reorder_point numeric not null default 0,
  unit_cost numeric not null default 0,
  unit_price numeric not null default 0,
  supplier text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_inventory_vendor_idx on public.shop_inventory(vendor_id);

-- ============================================================
-- Work orders + lines
-- ============================================================
create table if not exists public.shop_work_orders (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  number text not null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in-progress', 'waiting-parts', 'completed', 'invoiced')),
  customer_name text not null default '',
  customer_email text not null default '',
  boat_label text not null default '',
  assigned_to text not null default '',
  bay text not null default '',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  engine_hours int,
  tax_rate numeric not null default 0,
  completed_at timestamptz,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, number)
);
create index if not exists shop_work_orders_vendor_idx on public.shop_work_orders(vendor_id, scheduled_start);

create table if not exists public.shop_work_order_lines (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.shop_work_orders(id) on delete cascade,
  kind text not null default 'labor' check (kind in ('labor', 'part', 'fee')),
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  inventory_item_id uuid references public.shop_inventory(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shop_work_order_lines_wo_idx on public.shop_work_order_lines(work_order_id);

-- ============================================================
-- Inbound parts shipments
-- ============================================================
create table if not exists public.shop_parts_shipments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  work_order_id uuid references public.shop_work_orders(id) on delete set null,
  inventory_item_id uuid references public.shop_inventory(id) on delete set null,
  quantity numeric not null default 1,
  supplier text not null default '',
  description text not null default '',
  carrier text not null default 'Other' check (carrier in ('UPS', 'FedEx', 'USPS', 'DHL', 'Other')),
  tracking_number text not null default '',
  status text not null default 'ordered'
    check (status in ('ordered', 'shipped', 'out-for-delivery', 'delivered', 'exception')),
  eta date,
  source text not null default 'manual' check (source in ('manual', 'email')),
  email_subject text,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists shop_parts_shipments_tracking_idx
  on public.shop_parts_shipments(vendor_id, tracking_number)
  where tracking_number <> '';

-- ============================================================
-- RLS: a shop sees only its own rows
-- ============================================================
alter table public.shop_settings enable row level security;
alter table public.shop_inventory enable row level security;
alter table public.shop_work_orders enable row level security;
alter table public.shop_work_order_lines enable row level security;
alter table public.shop_parts_shipments enable row level security;

create or replace function public.is_my_vendor(vid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.vendor_profiles where id = vid and user_id = auth.uid());
$$;

drop policy if exists "Shop manages settings" on public.shop_settings;
create policy "Shop manages settings" on public.shop_settings
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

drop policy if exists "Shop manages inventory" on public.shop_inventory;
create policy "Shop manages inventory" on public.shop_inventory
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

drop policy if exists "Shop manages work orders" on public.shop_work_orders;
create policy "Shop manages work orders" on public.shop_work_orders
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

drop policy if exists "Shop manages work order lines" on public.shop_work_order_lines;
create policy "Shop manages work order lines" on public.shop_work_order_lines
  for all using (
    exists (select 1 from public.shop_work_orders w where w.id = work_order_id and public.is_my_vendor(w.vendor_id))
  ) with check (
    exists (select 1 from public.shop_work_orders w where w.id = work_order_id and public.is_my_vendor(w.vendor_id))
  );

drop policy if exists "Shop manages shipments" on public.shop_parts_shipments;
create policy "Shop manages shipments" on public.shop_parts_shipments
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

-- ============================================================
-- Inventory moves with work order part lines (no double counting)
-- ============================================================
create or replace function public.shop_line_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only ever touch stock owned by the shop that owns the work order.
  if tg_op in ('UPDATE', 'DELETE') and old.kind = 'part' and old.inventory_item_id is not null then
    update public.shop_inventory i
      set qty_on_hand = i.qty_on_hand + old.quantity, updated_at = now()
      from public.shop_work_orders w
      where i.id = old.inventory_item_id and w.id = old.work_order_id and i.vendor_id = w.vendor_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.kind = 'part' and new.inventory_item_id is not null then
    update public.shop_inventory i
      set qty_on_hand = i.qty_on_hand - new.quantity, updated_at = now()
      from public.shop_work_orders w
      where i.id = new.inventory_item_id and w.id = new.work_order_id and i.vendor_id = w.vendor_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_shop_line_inventory on public.shop_work_order_lines;
create trigger on_shop_line_inventory
  after insert or update or delete on public.shop_work_order_lines
  for each row execute procedure public.shop_line_inventory();

-- Atomic count adjustment (cycle counts, shrink, manual receive). Runs as the
-- caller so RLS still limits it to the shop's own items.
create or replace function public.shop_adjust_inventory(item_id uuid, delta numeric)
returns numeric
language sql
security invoker
set search_path = public
as $$
  update public.shop_inventory
    set qty_on_hand = qty_on_hand + delta, updated_at = now()
    where id = item_id
    returning qty_on_hand;
$$;

-- Receiving a shipment linked to a stock item puts it on the shelf once.
create or replace function public.shop_receive_shipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.received_at is not null and old.received_at is null and new.inventory_item_id is not null then
    update public.shop_inventory
      set qty_on_hand = qty_on_hand + new.quantity, updated_at = now()
      where id = new.inventory_item_id and vendor_id = new.vendor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_shop_receive_shipment on public.shop_parts_shipments;
create trigger on_shop_receive_shipment
  after update on public.shop_parts_shipments
  for each row execute procedure public.shop_receive_shipment();

-- ============================================================
-- Fix: projects <-> bids RLS recursion
-- "Vendors see projects they bid on" read bids, whose owner policies read
-- projects, so Postgres rejected every authenticated read/update of projects
-- ("infinite recursion detected in policy"). Check bids via a definer helper.
-- ============================================================
create or replace function public.vendor_bid_on_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bids b
    join public.vendor_profiles vp on vp.id = b.vendor_id
    where b.project_id = pid and vp.user_id = auth.uid()
  );
$$;

drop policy if exists "Vendors see projects they bid on" on public.projects;
create policy "Vendors see projects they bid on" on public.projects
  for select using (public.vendor_bid_on_project(id));

-- ============================================================
-- Boat logbook: vendor-verified entries in service_records
-- ============================================================
alter table public.service_records
  add column if not exists source text not null default 'owner',
  add column if not exists vendor_id uuid references public.vendor_profiles(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists work_order_id uuid references public.shop_work_orders(id) on delete set null,
  add column if not exists labor_hours numeric,
  add column if not exists line_items jsonb not null default '[]'::jsonb;

create unique index if not exists service_records_project_idx
  on public.service_records(project_id) where project_id is not null;
create unique index if not exists service_records_work_order_idx
  on public.service_records(work_order_id) where work_order_id is not null;

-- Owners can't forge vendor-verified entries; those come from triggers only.
drop policy if exists "Owners manage records" on public.service_records;
drop policy if exists "Owners insert own records" on public.service_records;
drop policy if exists "Owners edit own records" on public.service_records;
drop policy if exists "Owners delete own records" on public.service_records;
create policy "Owners insert own records" on public.service_records
  for insert with check (auth.uid() = owner_id and source = 'owner' and vendor_id is null and work_order_id is null);
create policy "Owners edit own records" on public.service_records
  for update using (auth.uid() = owner_id and source = 'owner')
  with check (auth.uid() = owner_id and source = 'owner' and vendor_id is null and work_order_id is null);
create policy "Owners delete own records" on public.service_records
  for delete using (auth.uid() = owner_id and source = 'owner');

-- A Bosun job completed by the owner lands in the log with the winning vendor.
create or replace function public.log_completed_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and new.boat_id is not null and new.chosen_bid_id is not null then
    select bd.price, vp.id as vendor_id, vp.business_name
      into b
      from public.bids bd
      join public.vendor_profiles vp on vp.id = bd.vendor_id
      where bd.id = new.chosen_bid_id;

    insert into public.service_records
      (boat_id, owner_id, title, date, cost, vendor_name, notes, source, vendor_id, project_id, line_items)
    values (
      new.boat_id, new.owner_id, new.title, current_date, b.price, b.business_name,
      new.description, 'bosun-job', b.vendor_id, new.id,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'kind', 'labor', 'description', li.description,
          'quantity', li.quantity, 'unitPrice', li.unit_price))
        from public.bid_line_items li where li.bid_id = new.chosen_bid_id
      ), '[]'::jsonb)
    )
    on conflict (project_id) where project_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_completed_log on public.projects;
create trigger on_project_completed_log
  after update on public.projects
  for each row execute procedure public.log_completed_project();

-- A shop work order tied to a Bosun job writes the itemized record to the
-- owner's logbook when it is completed. Only jobs this shop actually won
-- qualify, so a shop can never write into a stranger's log.
create or replace function public.log_completed_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  vname text;
  lines jsonb;
  labor numeric;
  total numeric;
begin
  if new.status in ('completed', 'invoiced')
     and (tg_op = 'INSERT' or old.status not in ('completed', 'invoiced'))
     and new.project_id is not null then
    select pr.id, pr.owner_id, pr.boat_id
      into p
      from public.projects pr
      join public.bids bd on bd.id = pr.chosen_bid_id
      where pr.id = new.project_id and bd.vendor_id = new.vendor_id;
    if p.id is null or p.boat_id is null then
      return new;
    end if;

    select business_name into vname from public.vendor_profiles where id = new.vendor_id;
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'kind', l.kind, 'description', l.description,
        'quantity', l.quantity, 'unitPrice', l.unit_price) order by l.sort_order), '[]'::jsonb),
      coalesce(sum(case when l.kind = 'labor' then l.quantity else 0 end), 0),
      coalesce(sum(l.quantity * l.unit_price), 0)
        + coalesce(sum(case when l.kind = 'part' then l.quantity * l.unit_price else 0 end), 0) * new.tax_rate / 100
      into lines, labor, total
      from public.shop_work_order_lines l
      where l.work_order_id = new.id;

    insert into public.service_records
      (boat_id, owner_id, title, date, engine_hours, cost, vendor_name, notes,
       source, vendor_id, project_id, work_order_id, labor_hours, line_items)
    values (
      p.boat_id, p.owner_id, new.title, coalesce(new.completed_at, now())::date,
      new.engine_hours, round(total, 2), vname, nullif(new.description, ''),
      'vendor', new.vendor_id, new.project_id, new.id, labor, lines
    )
    on conflict (project_id) where project_id is not null do update set
      title = excluded.title,
      date = excluded.date,
      engine_hours = excluded.engine_hours,
      cost = excluded.cost,
      notes = coalesce(excluded.notes, public.service_records.notes),
      source = 'vendor',
      work_order_id = excluded.work_order_id,
      labor_hours = excluded.labor_hours,
      line_items = excluded.line_items;
  end if;
  return new;
end;
$$;

drop trigger if exists on_work_order_completed_log on public.shop_work_orders;
create trigger on_work_order_completed_log
  after insert or update on public.shop_work_orders
  for each row execute procedure public.log_completed_work_order();

-- ============================================================
-- Realtime: inventory and shipments update live across devices
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.shop_inventory;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.shop_parts_shipments;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.shop_work_orders;
  exception when others then null;
  end;
end $$;
