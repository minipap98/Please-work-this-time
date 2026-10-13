-- Stand-ins for what Supabase provides, so schema.sql + migrations/*.sql run on a plain local Postgres.
-- createdb bosun_scratch && psql -d bosun_scratch -f supabase/scratch-stubs.sql -f supabase/schema.sql, then each migration in date order.
-- Expected noise: supabase_realtime publication and pg_net errors.
do $$ begin
  perform 1 from pg_roles where rolname='anon'; if not found then create role anon nologin; end if;
  perform 1 from pg_roles where rolname='authenticated'; if not found then create role authenticated nologin; end if;
  perform 1 from pg_roles where rolname='service_role'; if not found then create role service_role nologin bypassrls; end if;
  perform 1 from pg_roles where rolname='postgres'; if not found then create role postgres superuser; end if;
  perform 1 from pg_roles where rolname='supabase_auth_admin'; if not found then create role supabase_auth_admin nologin; end if;
end $$;
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists net;
create extension if not exists pgcrypto;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), email_confirmed_at timestamptz, banned_until timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
create or replace function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'),1)] $$;
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select 1::bigint $$;
