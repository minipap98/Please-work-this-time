// Where a notification takes you when tapped: the same answer in the bell menu and from a push.

import type { AppRole } from "../api";

export interface NotificationData {
  project_id?: string;
  bid_id?: string;
  /** A boat transfer waiting for the buyer. */
  transfer_token?: string;
  boat_id?: string;
  /** A reply on an owners' community thread. */
  post_id?: string;
}

export function notificationRoute(data: NotificationData | null | undefined, role: AppRole | null | undefined): string {
  if (data?.transfer_token) return `/transfer/${data.transfer_token}`;
  if (data?.post_id) return `/owners/post/${data.post_id}`;
  if (data?.boat_id) return "/my-boats";
  if (data?.project_id) return `/project/${data.project_id}`;
  return role === "vendor" ? "/vendor-my-bids" : "/inbox";
}

/** "5m ago", "3h ago", "2d ago". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
