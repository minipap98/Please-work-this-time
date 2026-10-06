-- A shop that bid on a job can see the boat the job is about (year, make, model, engines, HIN, home port),
-- so its work order and customer file fill in from the job. Owners' other boats stay private.
drop policy if exists "Shops see boats on jobs they bid on" on public.boats;
create policy "Shops see boats on jobs they bid on" on public.boats
  for select to authenticated using (
    exists (
      select 1
      from public.projects p
      join public.bids b on b.project_id = p.id
      join public.vendor_profiles v on v.id = b.vendor_id
      where p.boat_id = boats.id and v.user_id = auth.uid()
    )
  );
