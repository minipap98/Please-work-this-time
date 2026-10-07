import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { isExpoPushToken, pushMessageFor, type NotificationLike } from "../../../../packages/shared/src/notifications/push.js";
import type { AppRole } from "../../../../packages/shared/src/api.js";

/**
 * POST /api/v1/push/dispatch — called by the Supabase Database Webhook on every
 * `notifications` insert (see supabase/migrations/20261025_push_webhook.sql). Sends the
 * notification to each of the person's registered devices through Expo's push service.
 *
 * Env: PUSH_WEBHOOK_SECRET (required; the webhook sends it as x-bosun-webhook-secret),
 * SUPABASE_SERVICE_ROLE_KEY (reads device_push_tokens), EXPO_ACCESS_TOKEN (optional).
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: NotificationLike & { user_id?: string };
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

function serviceDb() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const handlePushDispatch: RequestHandler = async (req, res) => {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "PUSH_WEBHOOK_SECRET isn't set on the server.", code: "not_configured" });
    return;
  }
  if (req.headers["x-bosun-webhook-secret"] !== secret) {
    res.status(401).json({ error: "Bad webhook secret." });
    return;
  }
  const payload = (req.body ?? {}) as WebhookPayload;
  const row = payload.record;
  if (payload.type !== "INSERT" || payload.table !== "notifications" || !row?.id || !row.user_id) {
    res.status(400).json({ error: "Expected a notifications INSERT payload." });
    return;
  }

  const db = serviceDb();
  if (!db) {
    res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server.", code: "not_configured" });
    return;
  }

  try {
    const [{ data: devices }, { data: profile }] = await Promise.all([
      db.from("device_push_tokens").select("token").eq("user_id", row.user_id),
      db.from("profiles").select("role").eq("id", row.user_id).maybeSingle(),
    ]);
    const tokens = (devices ?? []).map((d) => d.token as string).filter(isExpoPushToken);
    if (tokens.length === 0) {
      res.json({ sent: 0 });
      return;
    }

    const message = pushMessageFor(row, (profile?.role as AppRole | undefined) ?? null);
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title: message.title, body: message.body, data: message.data }))),
    });
    const json = (await resp.json().catch(() => ({}))) as { data?: ExpoTicket[] };
    const tickets = json.data ?? [];

    // Devices Apple no longer knows about are forgotten so we stop sending to them.
    const dead = tokens.filter((_, i) => tickets[i]?.details?.error === "DeviceNotRegistered");
    if (dead.length) await db.from("device_push_tokens").delete().in("token", dead);

    res.json({ sent: tickets.filter((t) => t.status === "ok").length, failed: tickets.filter((t) => t.status === "error").length, removed: dead.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Push failed." });
  }
};
