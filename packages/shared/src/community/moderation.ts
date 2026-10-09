// What the Bosun team sees and does in Admin › Community. Served by /api/admin/community (service role).

export type ModerationKind = "post" | "reply" | "report";
export type ModerationAction = "hide" | "unhide" | "pin" | "unpin" | "delete" | "resolve";

export const MODERATION_ACTIONS: Record<ModerationKind, ModerationAction[]> = {
  post: ["hide", "unhide", "pin", "unpin", "delete"],
  reply: ["hide", "unhide", "delete"],
  report: ["resolve"],
};

export interface AdminCommunityPost {
  id: string;
  title: string;
  excerpt: string;
  make: string;
  model: string | null;
  author: string;
  authorId: string;
  createdAt: string;
  replies: number;
  reports: number;
  pinned: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
}

export interface AdminCommunityReport {
  id: string;
  kind: "post" | "reply";
  targetId: string;
  /** The thread to open, for a reply as well as a post. */
  postId: string | null;
  reason: string;
  reporter: string;
  createdAt: string;
  /** The reported text, shortened. Null when it's already been deleted. */
  excerpt: string | null;
  author: string | null;
  hidden: boolean;
}

export interface AdminCommunity {
  reports: AdminCommunityReport[];
  posts: AdminCommunityPost[];
  totals: { posts: number; replies: number; openReports: number; hidden: number };
}

export function isModerationAction(kind: string, action: string): action is ModerationAction {
  return (MODERATION_ACTIONS[kind as ModerationKind] ?? []).includes(action as ModerationAction);
}
