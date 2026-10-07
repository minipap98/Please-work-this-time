-- "New job near you" uses real distance when both sides have a verified location: the job's
-- rounded coordinates against the shop's PostGIS point and its service_radius_miles. Jobs or
-- shops without coordinates fall back to the text match that was here before, so nobody
-- loses notifications. Same trigger, same notification. Run in the SQL Editor (without RLS).

create or replace function public.notify_matching_vendors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_point geography;
begin
  if new.lat is not null and new.lng is not null then
    job_point := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
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
        st_dwithin(vp.location, job_point, coalesce(vp.service_radius_miles, 50) * 1609.344)
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
