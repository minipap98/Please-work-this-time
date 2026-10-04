-- Model insights: known weak spots for a boat's make/model/engine.
-- Run in the SQL Editor and choose "Run without RLS".
--
-- 1. model_known_issues: curated by admins from what technicians report.
--    Not private (no owner data), so signed-in users can read it.
-- 2. model_insights(): adds patterns from Bosun's own service records:
--    the same part replaced on 3+ different boats of the same model (or
--    engine). Only counts come back, never anyone's records.

create table if not exists public.model_known_issues (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model_pattern text not null default '%',
  engine_make text,
  engine_model_pattern text,
  component text not null,
  summary text not null,
  advice text,
  source text not null default 'Reported by marine technicians',
  created_at timestamptz not null default now()
);
alter table public.model_known_issues enable row level security;
drop policy if exists "Signed-in users read known issues" on public.model_known_issues;
create policy "Signed-in users read known issues" on public.model_known_issues
  for select to authenticated using (true);
drop policy if exists "Admins manage known issues" on public.model_known_issues;
create policy "Admins manage known issues" on public.model_known_issues
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.model_known_issues (make, model_pattern, component, summary, advice)
select 'Sea Ray', 'SDX 250%', 'Power steering pump',
  'A known weak spot on this model. Pumps get replaced often.',
  'Ask your shop to check the pump and fluid at your next service.'
where not exists (
  select 1 from public.model_known_issues where make = 'Sea Ray' and component = 'Power steering pump'
);

create or replace function public.model_insights(
  p_make text, p_model text, p_engine_make text default null, p_engine_model text default null
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with parts(component, pat) as (values
    ('Power steering pump', '%steering pump%'),
    ('Water pump / impeller', '%impeller%'),
    ('Water pump / impeller', '%water pump%'),
    ('Thermostat', '%thermostat%'),
    ('Fuel pump', '%fuel pump%'),
    ('Starter', '%starter%'),
    ('Alternator', '%alternator%'),
    ('Trim/tilt unit', '%tilt%'),
    ('Trim/tilt unit', '%trim pump%'),
    ('Lower unit', '%lower unit%'),
    ('Gimbal bearing', '%gimbal%'),
    ('Exhaust bellows', '%bellow%'),
    ('Exhaust manifold / risers', '%riser%'),
    ('Bilge pump', '%bilge pump%'),
    ('Fuel/water separator', '%separator%'),
    ('Ignition coil', '%coil%'),
    ('Shift cable', '%shift cable%')
  ),
  recs as (
    select b.id as boat_id,
           lower(b.make) = lower(p_make) and lower(b.model) = lower(p_model) as same_model,
           p_engine_model is not null and lower(coalesce(b.engine_make, '')) = lower(coalesce(p_engine_make, ''))
             and lower(coalesce(b.engine_model, '')) = lower(p_engine_model) as same_engine,
           lower(r.title || ' ' || coalesce(r.line_items::text, '')) as body
    from service_records r join boats b on b.id = r.boat_id
  ),
  fleet as (
    select count(distinct boat_id) filter (where same_model) as model_boats,
           count(distinct boat_id) filter (where same_engine) as engine_boats
    from (select b.id as boat_id,
                 lower(b.make) = lower(p_make) and lower(b.model) = lower(p_model) as same_model,
                 p_engine_model is not null and lower(coalesce(b.engine_make, '')) = lower(coalesce(p_engine_make, ''))
                   and lower(coalesce(b.engine_model, '')) = lower(p_engine_model) as same_engine
          from boats b) x
  ),
  hits as (
    select p.component,
           count(distinct r.boat_id) filter (where r.same_model) as model_boats,
           count(distinct r.boat_id) filter (where r.same_engine) as engine_boats
    from recs r join parts p on r.body like p.pat
    where r.same_model or r.same_engine
    group by p.component
  )
  select json_build_object(
    'known', coalesce((
      select json_agg(json_build_object('component', k.component, 'summary', k.summary,
                                        'advice', k.advice, 'source', k.source) order by k.component)
      from model_known_issues k
      where lower(k.make) = lower(p_make)
        and lower(p_model) like lower(k.model_pattern)
        and (k.engine_make is null or lower(k.engine_make) = lower(coalesce(p_engine_make, '')))
        and (k.engine_model_pattern is null or lower(coalesce(p_engine_model, '')) like lower(k.engine_model_pattern))
    ), '[]'::json),
    'patterns', coalesce((
      select json_agg(x order by x.boats desc) from (
        select h.component, 'model' as scope, h.model_boats as boats, f.model_boats as of_boats
        from hits h, fleet f where h.model_boats >= 3
        union all
        select h.component, 'engine', h.engine_boats, f.engine_boats
        from hits h, fleet f where h.engine_boats >= 3 and h.model_boats < 3
      ) x
    ), '[]'::json)
  );
$$;

revoke all on function public.model_insights(text, text, text, text) from public, anon;
grant execute on function public.model_insights(text, text, text, text) to authenticated;
