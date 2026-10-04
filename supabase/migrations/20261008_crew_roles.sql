-- Crew roles (tech / manager) and renaming a crew member without losing their jobs.
-- Run after 20261007_shop_crew.sql. Safe to run more than once.

alter table public.shop_members
  add column if not exists role text not null default 'tech';
alter table public.shop_members drop constraint if exists shop_members_role_check;
alter table public.shop_members
  add constraint shop_members_role_check check (role in ('tech', 'manager'));

create or replace function public.is_shop_manager(vid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_members m
    where m.vendor_id = vid and m.user_id = auth.uid() and m.role = 'manager'
  );
$$;

-- Managers run the board: work orders, lines, inventory and parts.
-- They can read shop settings and the crew list but not change them.
drop policy if exists "Managers run work orders" on public.shop_work_orders;
create policy "Managers run work orders" on public.shop_work_orders
  for all to authenticated
  using (public.is_shop_manager(vendor_id)) with check (public.is_shop_manager(vendor_id));

drop policy if exists "Managers run work order lines" on public.shop_work_order_lines;
create policy "Managers run work order lines" on public.shop_work_order_lines
  for all to authenticated
  using (exists (select 1 from public.shop_work_orders w where w.id = work_order_id and public.is_shop_manager(w.vendor_id)))
  with check (exists (select 1 from public.shop_work_orders w where w.id = work_order_id and public.is_shop_manager(w.vendor_id)));

drop policy if exists "Managers run inventory" on public.shop_inventory;
create policy "Managers run inventory" on public.shop_inventory
  for all to authenticated
  using (public.is_shop_manager(vendor_id)) with check (public.is_shop_manager(vendor_id));

drop policy if exists "Managers run shipments" on public.shop_parts_shipments;
create policy "Managers run shipments" on public.shop_parts_shipments
  for all to authenticated
  using (public.is_shop_manager(vendor_id)) with check (public.is_shop_manager(vendor_id));

drop policy if exists "Managers read settings" on public.shop_settings;
create policy "Managers read settings" on public.shop_settings
  for select to authenticated using (public.is_shop_manager(vendor_id));

drop policy if exists "Managers read crew" on public.shop_members;
create policy "Managers read crew" on public.shop_members
  for select to authenticated using (public.is_shop_manager(vendor_id));

-- Rename a crew member and carry their assigned jobs and board slot with them.
create or replace function public.rename_crew_member(member_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor uuid;
  v_old text;
  v_new text := btrim(new_name);
begin
  v_vendor := (select vendor_id from public.shop_members where id = member_id);
  v_old := (select tech_name from public.shop_members where id = member_id);
  if v_vendor is null or not public.is_my_vendor(v_vendor) then
    raise exception 'Not allowed';
  end if;
  if v_new = '' or v_new = v_old then
    return;
  end if;
  update public.shop_members set tech_name = v_new where id = member_id;
  update public.shop_work_orders set assigned_to = v_new, updated_at = now()
    where vendor_id = v_vendor and assigned_to = v_old;
  update public.shop_settings
    set techs = array_replace(techs, v_old, v_new), updated_at = now()
    where vendor_id = v_vendor;
end;
$$;
revoke execute on function public.rename_crew_member(uuid, text) from public, anon;
grant execute on function public.rename_crew_member(uuid, text) to authenticated;
