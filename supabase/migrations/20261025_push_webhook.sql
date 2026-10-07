-- Every new notifications row is POSTed to the Bosun server, which sends the push.
-- This is a Supabase Database Webhook (pg_net). Two ways to set it up:
--
--   A) Dashboard: Database → Webhooks → Create: table `notifications`, event INSERT,
--      type HTTP request, POST https://getbosun.app/api/v1/push/dispatch,
--      header `x-bosun-webhook-secret: <PUSH_WEBHOOK_SECRET>`.
--
--   B) This file. Replace __PUSH_WEBHOOK_SECRET__ with the same value you set as
--      PUSH_WEBHOOK_SECRET on the server, then run in the SQL Editor (without RLS).
--      Do not commit the filled-in version.
--
-- Either way the server verifies the header before it reads anything.

create extension if not exists pg_net with schema extensions;

drop trigger if exists on_notification_push on public.notifications;
create trigger on_notification_push
  after insert on public.notifications
  for each row
  execute function supabase_functions.http_request(
    'https://getbosun.app/api/v1/push/dispatch',
    'POST',
    '{"Content-Type":"application/json","x-bosun-webhook-secret":"__PUSH_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );
