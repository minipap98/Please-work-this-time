-- Every new notifications row is POSTed to the Bosun server, which sends the push. Uses pg_net
-- directly (the same mechanism Supabase's dashboard "Database Webhooks" use), with the same
-- payload shape: { type, table, schema, record, old_record }.
--
-- Replace __PUSH_WEBHOOK_SECRET__ with the value set as PUSH_WEBHOOK_SECRET on the server,
-- then run in the SQL Editor (without RLS). Do not commit the filled-in version. To rotate the
-- secret, run the two `create or replace function` / `update` statements again with the new value.

create extension if not exists pg_net with schema extensions;

create or replace function public.push_notification_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://getbosun.app/api/v1/push/dispatch',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bosun-webhook-secret', '__PUSH_WEBHOOK_SECRET__'
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;
revoke all on function public.push_notification_webhook() from public, anon, authenticated;

drop trigger if exists on_notification_push on public.notifications;
create trigger on_notification_push
  after insert on public.notifications
  for each row execute function public.push_notification_webhook();
