// Chat on a bid, and the in-app notification list. Realtime subscriptions stay in each app.

import type { Db } from "../db/client";
import type { InsertTables, Tables } from "../database.types";

export type MessageRow = Tables<"messages">;
export type NotificationRow = Tables<"notifications">;

export async function listBidMessages(client: Db, bidId: string): Promise<MessageRow[]> {
  const { data, error } = await client.from("messages").select("*").eq("bid_id", bidId).order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(client: Db, senderId: string, msg: Omit<InsertTables<"messages">, "sender_id">): Promise<MessageRow> {
  const { data, error } = await client.from("messages").insert({ ...msg, sender_id: senderId }).select().single();
  if (error) throw error;
  return data;
}

/** Mark everything sent to me on this bid as read. */
export async function markMessagesRead(client: Db, userId: string, bidId: string): Promise<void> {
  const { error } = await client
    .from("messages")
    .update({ status: "read" as const })
    .eq("bid_id", bidId)
    .eq("recipient_id", userId)
    .neq("status", "read");
  if (error) throw error;
}

export async function listNotifications(client: Db, userId: string, limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Mark one notification read, or all of mine when no id is given. */
export async function markNotificationsRead(client: Db, userId: string, id?: string): Promise<void> {
  let q = client.from("notifications").update({ read: true }).eq("user_id", userId);
  if (id) q = q.eq("id", id);
  const { error } = await q;
  if (error) throw error;
}
