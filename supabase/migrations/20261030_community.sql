-- Owner community: threads for people who own the same boats. A group is a make ("Pursuit owners")
-- or a make + model ("Pursuit DC 326 owners"). Nobody creates groups; your boats put you in them.
-- Only owner accounts read and write (shops don't see it); you can start a thread only in a group
-- one of your boats belongs to; the Bosun team moderates through /api/admin/* (service role).
-- Run after 20261029_owned_since.sql in the SQL Editor (without RLS). Safe to run more than once.

alter type public.notification_type add value if not exists 'community_reply';

-- "Sea Ray" → "sea-ray", "DC 326" → "dc-326". The same in shared/community/community.ts.
create or replace function public.community_key(txt text)
returns text
language sql
immutable
strict
as $$
  select trim(both '-' from regexp_replace(lower(txt), '[^a-z0-9]+', '-', 'g'));
$$;

-- profile_cards() shows "Dean M."; the community does the same.
create or replace function public.community_display_name(n text)
returns text
language sql
immutable
as $$
  select split_part(coalesce(n, ''), ' ', 1) ||
         case when position(' ' in coalesce(n, '')) > 0 then ' ' || left(split_part(n, ' ', 2), 1) || '.' else '' end;
$$;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  boat_id uuid references public.boats(id) on delete set null,
  make text not null,
  model text,
  make_key text not null,
  model_key text,
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  photo_url text,
  pinned boolean not null default false,
  hidden_at timestamptz,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_group_idx on public.community_posts(make_key, model_key, created_at desc);
create index if not exists community_posts_author_idx on public.community_posts(author_id, created_at desc);

create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  hidden_at timestamptz,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_replies_post_idx on public.community_replies(post_id, created_at);
create index if not exists community_replies_author_idx on public.community_replies(author_id, created_at desc);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade,
  reply_id uuid references public.community_replies(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  check ((post_id is null) <> (reply_id is null))
);
create index if not exists community_reports_open_idx on public.community_reports(created_at desc) where resolved_at is null;

alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reports enable row level security;

-- An owner account. Shops never see the community.
create or replace function public.community_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;
revoke execute on function public.community_is_owner() from public;
grant execute on function public.community_is_owner() to authenticated;

-- Does one of my boats put me in this group?
create or replace function public.community_can_post(p_make text, p_model text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.community_key(coalesce(p_make, '')) not in ('', 'unknown') and exists (
    select 1 from public.boats b
    where b.owner_id = auth.uid()
      and public.community_key(b.make) = public.community_key(p_make)
      and (p_model is null or public.community_key(b.model) = public.community_key(p_model))
  );
$$;
revoke execute on function public.community_can_post(text, text) from public;
grant execute on function public.community_can_post(text, text) to authenticated;

-- Posts: owners read what isn't hidden; you write as yourself (the trigger checks the rest).
drop policy if exists "Owners read community posts" on public.community_posts;
create policy "Owners read community posts" on public.community_posts
  for select to authenticated
  using (hidden_at is null and public.community_is_owner());
drop policy if exists "Owners write own community posts" on public.community_posts;
create policy "Owners write own community posts" on public.community_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.community_is_owner());
drop policy if exists "Authors edit own community posts" on public.community_posts;
create policy "Authors edit own community posts" on public.community_posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
drop policy if exists "Authors delete own community posts" on public.community_posts;
create policy "Authors delete own community posts" on public.community_posts
  for delete to authenticated
  using (author_id = auth.uid());

-- Replies: visible while the reply and its thread are; any owner may reply.
drop policy if exists "Owners read community replies" on public.community_replies;
create policy "Owners read community replies" on public.community_replies
  for select to authenticated
  using (
    hidden_at is null and public.community_is_owner()
    and exists (select 1 from public.community_posts p where p.id = post_id and p.hidden_at is null)
  );
drop policy if exists "Owners write own community replies" on public.community_replies;
create policy "Owners write own community replies" on public.community_replies
  for insert to authenticated
  with check (author_id = auth.uid() and public.community_is_owner());
drop policy if exists "Authors edit own community replies" on public.community_replies;
create policy "Authors edit own community replies" on public.community_replies
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
drop policy if exists "Authors delete own community replies" on public.community_replies;
create policy "Authors delete own community replies" on public.community_replies
  for delete to authenticated
  using (author_id = auth.uid());

-- Reports: anyone signed in can flag something; you see only your own flags. Admins read via the API.
drop policy if exists "Users file community reports" on public.community_reports;
create policy "Users file community reports" on public.community_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists "Users see own community reports" on public.community_reports;
create policy "Users see own community reports" on public.community_reports
  for select to authenticated
  using (reporter_id = auth.uid());

-- Writing a post: normalise the group, prove you own such a boat, and keep it to 10 a day.
-- The service role (auth.uid() null) skips the checks so the team can seed or repair.
create or replace function public.community_posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  new.make := trim(new.make);
  new.model := nullif(trim(coalesce(new.model, '')), '');
  new.title := trim(new.title);
  new.body := trim(new.body);
  new.make_key := public.community_key(new.make);
  new.model_key := case when new.model is null then null else public.community_key(new.model) end;
  if new.make_key in ('', 'unknown') or new.model_key = '' then
    raise exception 'Pick the boat this is about.';
  end if;
  if auth.uid() is not null then
    if new.author_id <> auth.uid() then
      raise exception 'Posts are written as yourself.';
    end if;
    if not public.community_is_owner() then
      raise exception 'Only boat owners can post here.';
    end if;
    if not public.community_can_post(new.make, new.model) then
      raise exception 'Add a % to My Boats to post in this group.', concat_ws(' ', new.make, new.model);
    end if;
    -- Spell the group the way the boat on file does, not the way it was typed.
    select b.make, case when new.model is null then null else b.model end into new.make, new.model
      from public.boats b
      where b.owner_id = auth.uid()
        and public.community_key(b.make) = new.make_key
        and (new.model_key is null or public.community_key(b.model) = new.model_key)
      order by b.created_at
      limit 1;
    if new.boat_id is not null and not exists (select 1 from public.boats where id = new.boat_id and owner_id = auth.uid()) then
      new.boat_id := null;
    end if;
    select count(*) into recent from public.community_posts
      where author_id = auth.uid() and created_at > now() - interval '1 day';
    if recent >= 10 then
      raise exception 'That''s plenty for one day. Try again tomorrow.';
    end if;
    new.pinned := false;
    new.hidden_at := null;
    new.hidden_reason := null;
  end if;
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.community_posts_before_insert() from public, anon, authenticated;
drop trigger if exists community_posts_before_insert on public.community_posts;
create trigger community_posts_before_insert
  before insert on public.community_posts
  for each row execute function public.community_posts_before_insert();

-- Editing a post: the author may change the title, body, photo and which boat it's about. Nothing else.
create or replace function public.community_posts_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.author_id <> old.author_id or new.make <> old.make or new.model is distinct from old.model
       or new.make_key <> old.make_key or new.model_key is distinct from old.model_key
       or new.pinned <> old.pinned or new.hidden_at is distinct from old.hidden_at
       or new.hidden_reason is distinct from old.hidden_reason or new.created_at <> old.created_at then
      raise exception 'Only the title, body and photo can be edited.';
    end if;
    if new.boat_id is not null and new.boat_id is distinct from old.boat_id
       and not exists (select 1 from public.boats where id = new.boat_id and owner_id = auth.uid()) then
      raise exception 'That boat isn''t on your account.';
    end if;
    new.title := trim(new.title);
    new.body := trim(new.body);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.community_posts_before_update() from public, anon, authenticated;
drop trigger if exists community_posts_before_update on public.community_posts;
create trigger community_posts_before_update
  before update on public.community_posts
  for each row execute function public.community_posts_before_update();

-- Replying: as yourself, as an owner, on a thread you can see, at most 60 a day.
create or replace function public.community_replies_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  new.body := trim(new.body);
  if auth.uid() is not null then
    if new.author_id <> auth.uid() then
      raise exception 'Replies are written as yourself.';
    end if;
    if not public.community_is_owner() then
      raise exception 'Only boat owners can reply here.';
    end if;
    if not exists (select 1 from public.community_posts p where p.id = new.post_id and p.hidden_at is null) then
      raise exception 'That thread is no longer open.';
    end if;
    select count(*) into recent from public.community_replies
      where author_id = auth.uid() and created_at > now() - interval '1 day';
    if recent >= 60 then
      raise exception 'That''s plenty for one day. Try again tomorrow.';
    end if;
    new.hidden_at := null;
    new.hidden_reason := null;
  end if;
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.community_replies_before_insert() from public, anon, authenticated;
drop trigger if exists community_replies_before_insert on public.community_replies;
create trigger community_replies_before_insert
  before insert on public.community_replies
  for each row execute function public.community_replies_before_insert();

create or replace function public.community_replies_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.author_id <> old.author_id or new.post_id <> old.post_id
       or new.hidden_at is distinct from old.hidden_at or new.hidden_reason is distinct from old.hidden_reason
       or new.created_at <> old.created_at then
      raise exception 'Only the text of a reply can be edited.';
    end if;
    new.body := trim(new.body);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.community_replies_before_update() from public, anon, authenticated;
drop trigger if exists community_replies_before_update on public.community_replies;
create trigger community_replies_before_update
  before update on public.community_replies
  for each row execute function public.community_replies_before_update();

-- A new reply tells the thread's author and everyone else who replied (not the person writing).
create or replace function public.community_replies_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.community_posts%rowtype;
  who text;
begin
  select * into post from public.community_posts where id = new.post_id;
  if post.id is null then return new; end if;
  select public.community_display_name(name) into who from public.profiles where id = new.author_id;
  insert into public.notifications (user_id, type, title, body, data)
  select u.user_id,
         'community_reply',
         coalesce(who, 'An owner') || ' replied: ' || post.title,
         left(new.body, 140),
         jsonb_build_object('post_id', post.id, 'make', post.make, 'model', post.model)
  from (
    select post.author_id as user_id
    union
    select r.author_id from public.community_replies r where r.post_id = post.id and r.id <> new.id
  ) u
  where u.user_id <> new.author_id;
  return new;
end;
$$;
revoke all on function public.community_replies_after_insert() from public, anon, authenticated;
drop trigger if exists community_replies_after_insert on public.community_replies;
create trigger community_replies_after_insert
  after insert on public.community_replies
  for each row execute function public.community_replies_after_insert();

-- "2021 Pursuit DC 326 · 2× Yamaha F300": the boat that puts this person in the group, or
-- failing that their newest boat. Make, model, year and engines only.
create or replace function public.community_author_boat(p_author uuid, p_make_key text, p_model_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select concat_ws(' · ',
           concat_ws(' ', b.year, b.make, b.model),
           nullif(concat_ws(' ', case when b.engine_count > 1 then b.engine_count || '×' end, b.engine_make, b.engine_model), ''))
  from public.boats b
  where b.owner_id = p_author
  order by (public.community_key(b.make) = p_make_key and (p_model_key is null or public.community_key(b.model) = p_model_key)) desc,
           (public.community_key(b.make) = p_make_key) desc,
           b.created_at desc
  limit 1;
$$;
revoke execute on function public.community_author_boat(uuid, text, text) from public;

create or replace function public.community_author_json(p_author uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('id', pr.id, 'name', public.community_display_name(pr.name), 'initials', pr.initials, 'avatarUrl', pr.avatar_url)
  from public.profiles pr where pr.id = p_author;
$$;
revoke execute on function public.community_author_json(uuid) from public;

create or replace function public.community_post_json(p public.community_posts)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', p.id,
    'make', p.make, 'model', p.model, 'makeKey', p.make_key, 'modelKey', p.model_key,
    'title', p.title, 'body', p.body, 'photoUrl', p.photo_url, 'pinned', p.pinned,
    'createdAt', p.created_at, 'updatedAt', p.updated_at,
    'replies', (select count(*) from public.community_replies r where r.post_id = p.id and r.hidden_at is null),
    'lastReplyAt', (select max(r.created_at) from public.community_replies r where r.post_id = p.id and r.hidden_at is null),
    'author', public.community_author_json(p.author_id),
    'authorBoat', public.community_author_boat(p.author_id, p.make_key, p.model_key),
    'mine', p.author_id = auth.uid()
  );
$$;
revoke execute on function public.community_post_json(public.community_posts) from public;

-- One group's board. p_model null = the whole make, model threads included. Owners only.
create or replace function public.community_feed(p_make text, p_model text default null, p_limit int default 50)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with g as (
    select public.community_key(coalesce(p_make, '')) as mk,
           case when nullif(trim(coalesce(p_model, '')), '') is null then null else public.community_key(p_model) end as mdk
  ),
  visible as (
    select p.* from public.community_posts p, g
    where p.hidden_at is null and p.make_key = g.mk and (g.mdk is null or p.model_key = g.mdk)
  ),
  page as (
    select v.* from visible v
    order by v.pinned desc,
             greatest(v.created_at, coalesce((select max(r.created_at) from public.community_replies r where r.post_id = v.id and r.hidden_at is null), v.created_at)) desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  select case when not public.community_is_owner() then null else json_build_object(
    'group', json_build_object(
      'make', coalesce(
        (select b.make from public.boats b, g where public.community_key(b.make) = g.mk order by b.created_at limit 1),
        (select v.make from visible v limit 1),
        trim(p_make)),
      'model', case when (select mdk from g) is null then null else coalesce(
        (select b.model from public.boats b, g where public.community_key(b.make) = g.mk and public.community_key(b.model) = g.mdk order by b.created_at limit 1),
        (select v.model from visible v limit 1),
        trim(p_model)) end,
      'makeKey', (select mk from g),
      'modelKey', (select mdk from g),
      'owners', (select count(distinct b.owner_id) from public.boats b, g
                 where public.community_key(b.make) = g.mk and (g.mdk is null or public.community_key(b.model) = g.mdk)),
      'posts', (select count(*) from visible),
      'canPost', public.community_can_post(p_make, nullif(trim(coalesce(p_model, '')), ''))
    ),
    'posts', coalesce((select json_agg(public.community_post_json(p) order by p.pinned desc,
      greatest(p.created_at, coalesce((select max(r.created_at) from public.community_replies r where r.post_id = p.id and r.hidden_at is null), p.created_at)) desc)
      from public.community_posts p where p.id in (select id from page)), '[]'::json)
  ) end;
$$;
revoke execute on function public.community_feed(text, text, int) from public;
grant execute on function public.community_feed(text, text, int) to authenticated;

-- One thread with its replies. Null when it doesn't exist, is hidden, or the caller isn't an owner.
create or replace function public.community_thread(p_post uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.community_is_owner() then null else (
    select json_build_object(
      'post', public.community_post_json(p),
      'replies', coalesce((
        select json_agg(json_build_object(
          'id', r.id, 'body', r.body, 'createdAt', r.created_at, 'updatedAt', r.updated_at,
          'author', public.community_author_json(r.author_id),
          'authorBoat', public.community_author_boat(r.author_id, p.make_key, p.model_key),
          'mine', r.author_id = auth.uid()
        ) order by r.created_at)
        from public.community_replies r where r.post_id = p.id and r.hidden_at is null
      ), '[]'::json),
      'canReply', auth.uid() is not null
    )
    from public.community_posts p where p.id = p_post and p.hidden_at is null
  ) end;
$$;
revoke execute on function public.community_thread(uuid) from public;
grant execute on function public.community_thread(uuid) to authenticated;

-- The groups my boats put me in: each model, and each make as a whole.
create or replace function public.community_my_groups()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.community_is_owner() then '[]'::json else coalesce((
    select json_agg(json_build_object(
      'make', z.make, 'model', z.model, 'makeKey', z.mk, 'modelKey', z.mdk,
      'owners', (select count(distinct b2.owner_id) from public.boats b2
                 where public.community_key(b2.make) = z.mk and (z.mdk is null or public.community_key(b2.model) = z.mdk)),
      'posts', (select count(*) from public.community_posts p
                where p.hidden_at is null and p.make_key = z.mk and (z.mdk is null or p.model_key = z.mdk))
    ) order by z.mk, z.mdk nulls first)
    from (
      select distinct on (y.mk, y.mdk) y.make, y.model, y.mk, y.mdk from (
        select b.make, b.model, public.community_key(b.make) as mk, public.community_key(b.model) as mdk
        from public.boats b where b.owner_id = auth.uid()
        union all
        select b.make, null, public.community_key(b.make), null
        from public.boats b where b.owner_id = auth.uid()
      ) y
      where y.mk not in ('', 'unknown') and coalesce(y.mdk, 'x') not in ('', 'unknown')
      order by y.mk, y.mdk
    ) z
  ), '[]'::json) end;
$$;
revoke execute on function public.community_my_groups() from public;
grant execute on function public.community_my_groups() to authenticated;

-- Where the talk is: the busiest groups across Bosun.
create or replace function public.community_active_groups(p_limit int default 20)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.community_is_owner() then '[]'::json else coalesce((
    select json_agg(json_build_object(
      'make', x.make, 'model', x.model, 'makeKey', x.make_key, 'modelKey', x.model_key,
      'posts', x.posts,
      'owners', (select count(distinct b.owner_id) from public.boats b
                 where public.community_key(b.make) = x.make_key and (x.model_key is null or public.community_key(b.model) = x.model_key))
    ) order by x.posts desc, x.latest desc)
    from (
      select min(p.make) as make, min(p.model) as model, p.make_key, p.model_key, count(*) as posts, max(p.created_at) as latest
      from public.community_posts p
      where p.hidden_at is null
      group by p.make_key, p.model_key
      order by count(*) desc, max(p.created_at) desc
      limit greatest(1, least(coalesce(p_limit, 20), 100))
    ) x
  ), '[]'::json) end;
$$;
revoke execute on function public.community_active_groups(int) from public;
grant execute on function public.community_active_groups(int) to authenticated;

-- Photos on a post: one public bucket, each owner writes to their own folder.
insert into storage.buckets (id, name, public)
values ('community-photos', 'community-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read community photos" on storage.objects;
create policy "Public read community photos" on storage.objects
  for select using (bucket_id = 'community-photos');
drop policy if exists "Owners upload community photos" on storage.objects;
create policy "Owners upload community photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-photos' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "Owners delete own community photos" on storage.objects;
create policy "Owners delete own community photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-photos' and auth.uid()::text = (storage.foldername(name))[1]);
