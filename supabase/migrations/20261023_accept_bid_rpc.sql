-- accept_bid(): the owner picks a bid in one transaction. Checks ownership, that the bid is on
-- this job, that the job is still open and the bid is live, then flags the winner, rejects the
-- rest and moves the job to in-progress with the booking in metadata. The existing
-- on_project_accepted_notify_vendor trigger tells the winner; the bid_rejected trigger below
-- tells the others. Run in the SQL Editor (without RLS).

create or replace function public.accept_bid(p_project uuid, p_bid uuid, p_booking jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.projects%rowtype;
  bid public.bids%rowtype;
begin
  select * into job from public.projects where id = p_project for update;
  if not found or job.owner_id is distinct from auth.uid() then
    raise exception 'Job not found.';
  end if;
  if job.status::text not in ('active', 'bidding', 'gathering') then
    raise exception 'This job is no longer taking bids.';
  end if;
  select * into bid from public.bids where id = p_bid and project_id = p_project for update;
  if not found then
    raise exception 'That bid is not on this job.';
  end if;
  if bid.withdrawn_at is not null then
    raise exception 'The shop withdrew this bid.';
  end if;
  if bid.expiry_date is not null and bid.expiry_date < now() then
    raise exception 'This bid has expired. Ask the shop to bid again.';
  end if;

  update public.bids set accepted = true, rejected = false where id = p_bid;
  update public.bids set rejected = true, accepted = false
    where project_id = p_project and id <> p_bid and withdrawn_at is null;
  update public.projects
    set chosen_bid_id = p_bid,
        status = 'in-progress',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('booking', p_booking)
    where id = p_project;
end;
$$;
revoke all on function public.accept_bid(uuid, uuid, jsonb) from public, anon;
grant execute on function public.accept_bid(uuid, uuid, jsonb) to authenticated;

-- Owners hear about new bids; shops hear when they weren't chosen. Both notification types
-- were in the enum from day one but nothing wrote them.
create or replace function public.notify_bid_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.projects%rowtype;
  shop_name text;
begin
  select * into job from public.projects where id = new.project_id;
  if job.id is null then return new; end if;
  select business_name into shop_name from public.vendor_profiles where id = new.vendor_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    job.owner_id,
    'bid_received',
    'New bid on ' || coalesce(job.title, 'your job'),
    coalesce(shop_name, 'A shop') || ' bid $' || to_char(coalesce(new.price, 0), 'FM999,999,990'),
    jsonb_build_object('project_id', new.project_id, 'bid_id', new.id)
  );
  return new;
end;
$$;
revoke all on function public.notify_bid_received() from public, anon, authenticated;

drop trigger if exists on_bid_received_notify_owner on public.bids;
create trigger on_bid_received_notify_owner
  after insert on public.bids
  for each row execute function public.notify_bid_received();

create or replace function public.notify_bid_rejected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vendor_user uuid;
  job_title text;
begin
  if new.rejected is true and old.rejected is not true and new.withdrawn_at is null then
    select vp.user_id into vendor_user from public.vendor_profiles vp where vp.id = new.vendor_id;
    select title into job_title from public.projects where id = new.project_id;
    if vendor_user is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        vendor_user,
        'bid_rejected',
        'Bid not chosen',
        'The owner went another way on ' || coalesce(job_title, 'a job') || '.',
        jsonb_build_object('project_id', new.project_id, 'bid_id', new.id)
      );
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_bid_rejected() from public, anon, authenticated;

drop trigger if exists on_bid_rejected_notify_vendor on public.bids;
create trigger on_bid_rejected_notify_vendor
  after update on public.bids
  for each row execute function public.notify_bid_rejected();
