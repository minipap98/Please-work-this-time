-- Three holes a mobile app would widen. All additive triggers; nothing the web does today trips them.
-- Run in the SQL Editor (without RLS).

-- 1. profiles: a signed-in user can update their own row, but not the columns that grant power.
--    (The service role, which the admin API uses, has no auth.uid() and is not limited.)
create or replace function public.profiles_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin can only be changed by the Bosun team.';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Your account type can''t be changed here.';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Change your email from account settings.';
    end if;
    if new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.stripe_account_id is distinct from old.stripe_account_id then
      raise exception 'Billing ids are managed by the server.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_guard_columns() from public, anon, authenticated;

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_columns();

-- 2. messages: on a bid thread, only the two parties can write, and only to each other.
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_user uuid;
  vendor_user uuid;
begin
  if new.bid_id is null or auth.uid() is null then
    return new;
  end if;
  select p.owner_id, vp.user_id into owner_user, vendor_user
  from public.bids b
  join public.projects p on p.id = b.project_id
  join public.vendor_profiles vp on vp.id = b.vendor_id
  where b.id = new.bid_id;
  if owner_user is null then
    raise exception 'Bid not found.';
  end if;
  if new.sender_id not in (owner_user, vendor_user) then
    raise exception 'You are not part of this conversation.';
  end if;
  if new.recipient_id is distinct from (case when new.sender_id = owner_user then vendor_user else owner_user end) then
    raise exception 'Messages on a bid go to the other party.';
  end if;
  return new;
end;
$$;
revoke all on function public.messages_before_insert() from public, anon, authenticated;

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.messages_before_insert();

-- 3. messages: the recipient may mark a message read, not rewrite it.
create or replace function public.messages_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.sender_id and (
    new.text is distinct from old.text
    or new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.bid_id is distinct from old.bid_id
    or new.is_quote is distinct from old.is_quote
    or new.quote_price is distinct from old.quote_price
  ) then
    raise exception 'Only the sender can change a message.';
  end if;
  return new;
end;
$$;
revoke all on function public.messages_before_update() from public, anon, authenticated;

drop trigger if exists messages_before_update on public.messages;
create trigger messages_before_update
  before update on public.messages
  for each row execute function public.messages_before_update();
