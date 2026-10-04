-- Vendor Insights: a shop's own bids next to anonymized market numbers.
-- Run in the SQL Editor and choose "Run without RLS".
--
-- Privacy rules:
--  * A vendor gets back only its own bids.
--  * Competition on a job is summarized (median, "were you lowest") only when
--    2+ other shops bid on it, so no single competitor's price is exposed.
--  * Category market numbers only appear when 3+ other shops bid in that
--    category, and only for categories the vendor bids in.

create or replace function public.vendor_market_insights()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id from vendor_profiles where user_id = auth.uid() limit 1
  ),
  b as (
    select bi.id, bi.project_id, bi.vendor_id, bi.price::numeric as price,
           coalesce(nullif(trim(p.category), ''), 'Other') as category,
           p.chosen_bid_id is not null as decided,
           coalesce(p.chosen_bid_id = bi.id, false) as won
    from bids bi
    join projects p on p.id = bi.project_id
    where bi.price > 0
  ),
  mine as (
    select b.*,
      (select count(distinct o.vendor_id) from b o
        where o.project_id = b.project_id and o.vendor_id <> b.vendor_id) as peers,
      (select percentile_cont(0.5) within group (order by o.price) from b o
        where o.project_id = b.project_id and o.vendor_id <> b.vendor_id) as peer_median,
      (select min(o.price) from b o
        where o.project_id = b.project_id and o.vendor_id <> b.vendor_id) as peer_min
    from b
    where b.vendor_id = (select id from me)
  ),
  market as (
    select category,
           count(distinct vendor_id) as vendors,
           count(*) as bids,
           count(*) filter (where decided) as decided,
           count(*) filter (where won) as wins,
           percentile_cont(0.5) within group (order by price) as median_price
    from b
    where vendor_id <> (select id from me)
      and category in (select category from mine)
    group by category
  )
  select json_build_object(
    'mine', coalesce((
      select json_agg(json_build_object(
        'category', category,
        'price', price,
        'peerMedian', case when peers >= 2 then round(peer_median::numeric, 2) end,
        'lowest', case when peers >= 2 then price <= peer_min end,
        'decided', decided,
        'won', won))
      from mine), '[]'::json),
    'market', coalesce((
      select json_agg(json_build_object(
        'category', category,
        'vendors', vendors,
        'bids', bids,
        'decided', decided,
        'wins', wins,
        'medianPrice', round(median_price::numeric, 2)))
      from market where vendors >= 3), '[]'::json)
  )
  where exists (select 1 from me);
$$;

revoke all on function public.vendor_market_insights() from public, anon;
grant execute on function public.vendor_market_insights() to authenticated;
