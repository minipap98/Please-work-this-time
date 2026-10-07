// What a push notification carries. Built from a notifications row on the server; read by the app on tap.

import type { AppRole } from "../api";
import { notificationRoute, type NotificationData } from "./route";

export interface NotificationLike {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
}

export interface PushMessage {
  title: string;
  body: string;
  data: {
    notification_id: string;
    type: string;
    project_id?: string;
    bid_id?: string;
    /** Same path the web bell opens; the app's router resolves it. */
    url: string;
  };
}

/** Push payload for a notifications row. `role` picks the fallback route when the row names no job. */
export function pushMessageFor(row: NotificationLike, role?: AppRole | null): PushMessage {
  const data = (row.data && typeof row.data === "object" ? row.data : {}) as NotificationData;
  return {
    title: row.title,
    body: row.body ?? "",
    data: {
      notification_id: row.id,
      type: row.type,
      ...(data.project_id ? { project_id: data.project_id } : {}),
      ...(data.bid_id ? { bid_id: data.bid_id } : {}),
      url: notificationRoute(data, role),
    },
  };
}

/** Expo push tokens look like ExponentPushToken[xxxxxxxx]. */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}
