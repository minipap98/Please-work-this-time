-- Shipments access rule, logged-in-only job board, and locked-down trigger functions.
-- Run after 20261004_privacy_and_finish_shop.sql. Safe to run more than once.

-- Shops manage only their own inbound parts.
drop policy if exists "Shop manages shipments" on public.shop_parts_shipments;
create policy "Shop manages shipments" on public.shop_parts_shipments
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

-- Open jobs are visible to signed-in users (vendors), not to anonymous visitors.
drop policy if exists "Vendors see active projects" on public.projects;
create policy "Vendors see active projects" on public.projects
  for select to authenticated
  using (status in ('active', 'bidding', 'gathering'));

-- Trigger functions run automatically; nobody needs to call them through the API.
revoke execute on function public.shop_line_inventory() from public, anon, authenticated;
revoke execute on function public.shop_receive_shipment() from public, anon, authenticated;
revoke execute on function public.shop_shipment_boat() from public, anon, authenticated;
revoke execute on function public.shop_work_order_boat_sync() from public, anon, authenticated;
revoke execute on function public.log_completed_project() from public, anon, authenticated;
revoke execute on function public.log_completed_work_order() from public, anon, authenticated;
