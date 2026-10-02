-- Parts orders are paired with the boat they were ordered for.
-- Run after 20261002_shop_os.sql

alter table public.shop_parts_shipments
  add column if not exists boat_label text not null default '',
  add column if not exists customer_name text not null default '';

create index if not exists shop_parts_shipments_wo_idx
  on public.shop_parts_shipments(work_order_id) where work_order_id is not null;

-- A shipment linked to a work order always carries that work order's boat and
-- customer, and can only link to a work order from the same shop.
create or replace function public.shop_shipment_boat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
begin
  if new.work_order_id is not null then
    select vendor_id, boat_label, customer_name into w
      from public.shop_work_orders where id = new.work_order_id;
    if w.vendor_id is distinct from new.vendor_id then
      new.work_order_id := null;
    else
      new.boat_label := w.boat_label;
      new.customer_name := w.customer_name;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_shop_shipment_boat on public.shop_parts_shipments;
create trigger on_shop_shipment_boat
  before insert or update of work_order_id, boat_label, customer_name on public.shop_parts_shipments
  for each row execute procedure public.shop_shipment_boat();

-- Renaming the boat or customer on a work order follows through to its parts.
create or replace function public.shop_work_order_boat_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.boat_label is distinct from old.boat_label or new.customer_name is distinct from old.customer_name then
    update public.shop_parts_shipments
      set boat_label = new.boat_label, customer_name = new.customer_name, updated_at = now()
      where work_order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_shop_work_order_boat_sync on public.shop_work_orders;
create trigger on_shop_work_order_boat_sync
  after update of boat_label, customer_name on public.shop_work_orders
  for each row execute procedure public.shop_work_order_boat_sync();

-- Backfill shipments already linked to work orders.
update public.shop_parts_shipments s
  set boat_label = w.boat_label, customer_name = w.customer_name
  from public.shop_work_orders w
  where s.work_order_id = w.id and s.vendor_id = w.vendor_id and s.boat_label = '';
