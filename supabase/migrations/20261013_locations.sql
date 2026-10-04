-- Verified locations: coordinates picked from Google Places (or a ZIP lookup).
-- Run in the SQL Editor and choose "Run without RLS".
--
-- Existing row-level security on each table already covers these columns.
-- Job coordinates are rounded by the app (about half a mile) so vendors never
-- see an owner's exact slip.

alter table public.profiles
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_place_id text;

alter table public.boats
  add column if not exists home_port_lat double precision,
  add column if not exists home_port_lng double precision,
  add column if not exists home_port_place_id text;

alter table public.vendor_profiles
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists place_id text;

alter table public.projects
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Keep the PostGIS point on vendor_profiles in step with lat/lng.
create or replace function public.vendor_sync_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  elsif tg_op = 'UPDATE' and (old.lat is not null or old.lng is not null) then
    new.location := null;
  end if;
  return new;
end;
$$;

drop trigger if exists vendor_sync_location on public.vendor_profiles;
create trigger vendor_sync_location
  before insert or update of lat, lng on public.vendor_profiles
  for each row execute function public.vendor_sync_location();

revoke all on function public.vendor_sync_location() from public, anon, authenticated;
