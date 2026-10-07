-- Accepting a bid becomes one database call, and the rules the web only checked in its UI
-- are enforced here for every app. Run in the SQL Editor (without RLS). Additive: no column
-- is renamed or dropped; the old two-write path keeps working until the apps switch.

-- Bid state the apps used to keep in the browser.
alter table public.bids add column if not exists seen_at timestamptz;        -- owner opened the job after this bid arrived
alter table public.bids add column if not exists withdrawn_at timestamptz;   -- vendor pulled the bid
alter table public.bids add column if not exists rejected_at timestamptz;    -- owner declined (rejected stays the flag)

create index if not exists bids_project_vendor_idx on public.bids (project_id, vendor_id);

-- One live bid per shop per job, and only while the job is taking bids.
create or replace function public.bids_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_status text;
begin
  select status::text into job_status from public.projects where id = new.project_id;
  if job_status is null then
    raise exception 'Job not found.';
  end if;
  if job_status not in ('active', 'bidding', 'gathering') then
    raise exception 'This job is no longer taking bids.';
  end if;
  if exists (
    select 1 from public.bids b
    where b.project_id = new.project_id and b.vendor_id = new.vendor_id and b.withdrawn_at is null
  ) then
    raise exception 'You already have a bid on this job.';
  end if;
  if coalesce(new.price, 0) <= 0 then
    raise exception 'Bid total must be greater than $0.';
  end if;
  return new;
end;
$$;
revoke all on function public.bids_before_insert() from public, anon, authenticated;

drop trigger if exists bids_before_insert on public.bids;
create trigger bids_before_insert
  before insert on public.bids
  for each row execute function public.bids_before_insert();

-- An accepted bid's terms are frozen; the owner's and the shop's flags can still move.
create or replace function public.bids_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.accepted is true and (
    new.price is distinct from old.price
    or new.message is distinct from old.message
    or new.expiry_date is distinct from old.expiry_date
  ) then
    raise exception 'An accepted bid can''t be changed.';
  end if;
  if new.rejected is true and old.rejected is not true then
    new.rejected_at := coalesce(new.rejected_at, now());
  elsif new.rejected is not true then
    new.rejected_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.bids_before_update() from public, anon, authenticated;

drop trigger if exists bids_before_update on public.bids;
create trigger bids_before_update
  before update on public.bids
  for each row execute function public.bids_before_update();
