-- Privacy lockdown + finish Shop OS / Boat Log.
-- Run after 20261003_parts_for_boats.sql. Safe to run more than once.

-- ============================================================
-- 1. Privacy: remove blanket "Allow public read" / "Allow auth insert"
--    rules that exposed private data to anyone with the public key.
--    Each table keeps its scoped rules (owner / sender / bidder / admin).
--    Vendor profiles, reviews, maintenance tasks and crew stay public.
-- ============================================================
drop policy if exists "Allow public read" on public.profiles;
drop policy if exists "Allow public read" on public.boats;
drop policy if exists "Allow public read" on public.boat_documents;
drop policy if exists "Allow public read" on public.messages;
drop policy if exists "Allow public read" on public.invoices;
drop policy if exists "Allow public read" on public.notifications;
drop policy if exists "Allow public read" on public.bids;
drop policy if exists "Allow public read" on public.bid_line_items;
drop policy if exists "Allow public read" on public.projects;
drop policy if exists "Allow public read" on public.project_photos;
drop policy if exists "Allow public read" on public.service_records;

-- Let anyone insert any row (spoofed senders, docs on other people's boats).
-- "Users send messages" and "Owners manage own docs" already cover the real cases.
drop policy if exists "Allow auth insert" on public.messages;
drop policy if exists "Allow auth insert" on public.boat_documents;

-- ============================================================
-- 2. Boat Log columns + owner rules (vendor-verified rows come from triggers)
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

-- ============================================================
-- 3. Inventory moves with part lines and checked-in shipments
-- ============================================================
create or replace function public.shop_line_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
-- 4. Completed jobs write to the owner's Boat Log
-- ============================================================
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
-- 5. Live updates across the shop's devices
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
