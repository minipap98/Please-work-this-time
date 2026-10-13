-- PostGIS moves out of the API-exposed schema.
--
-- Supabase's security linter flags public.spatial_ref_sys ("table publicly accessible"): it's
-- PostGIS's coordinate-system reference table, it lives in `public` because that's where the
-- extension was installed, and its grants to anon/authenticated come from supabase_admin, so
-- nothing run as postgres can revoke them or turn on RLS. Reinstalling PostGIS in the
-- `extensions` schema (where Supabase installs it on new projects) takes the table out of the
-- REST API entirely. The only things that depend on PostGIS are the shop point
-- (vendor_profiles.location), the unused crew_members.coordinates, their GiST indexes and the
-- two trigger functions; they're rebuilt below and the shop points are recomputed from lat/lng.
-- The triggers themselves survive (the functions are replaced, not dropped).
-- Run in the SQL Editor (without RLS).

-- 1. Drop what holds PostGIS types (the GiST indexes go with the columns).
alter table public.vendor_profiles drop column if exists location;
alter table public.crew_members drop column if exists coordinates;

-- 2. Reinstall the extension where it belongs.
drop extension if exists postgis;
create extension if not exists postgis with schema extensions;

-- 3. Put the columns back, typed from the new schema.
alter table public.vendor_profiles add column location extensions.geography(Point, 4326);
create index idx_vendor_profiles_location on public.vendor_profiles using gist (location);
alter table public.crew_members add column coordinates extensions.geography(Point, 4326);
create index idx_crew_members_location on public.crew_members using gist (coordinates);

-- 4. The two functions that touch PostGIS now see the extensions schema.
create or replace function public.vendor_sync_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  elsif tg_op = 'UPDATE' and (old.lat is not null or old.lng is not null) then
    new.location := null;
  end if;
  return new;
end;
$$;
revoke all on function public.vendor_sync_location() from public, anon, authenticated;

create or replace function public.notify_matching_vendors()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  job_point extensions.geography;
begin
  if new.lat is not null and new.lng is not null then
    job_point := extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select
    vp.user_id,
    'project_update',
    'New job near you',
    coalesce(new.title, 'A boat owner posted a job'),
    jsonb_build_object(
      'project_id', new.id,
      'category', new.category,
      'location', new.location
    )
  from public.vendor_profiles vp
  where (
    new.category is null
    or cardinality(vp.specialties) = 0
    or new.category = any (vp.specialties)
  )
  and (
    case
      when job_point is not null and vp.location is not null then
        extensions.st_dwithin(vp.location, job_point, coalesce(vp.service_radius_miles, 50) * 1609.344)
      else
        new.location is null
        or coalesce(vp.service_area, '') = ''
        or new.location ilike '%' || split_part(replace(vp.service_area, '·', ','), ',', 1) || '%'
        or vp.service_area ilike '%' || new.location || '%'
    end
  );
  return new;
end;
$$;
revoke all on function public.notify_matching_vendors() from public, anon, authenticated;

-- 5. Rebuild the shop points from the lat/lng that's still on the rows.
update public.vendor_profiles
   set location = extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
 where lat is not null and lng is not null;
