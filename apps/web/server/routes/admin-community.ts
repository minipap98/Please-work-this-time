// Admin › Community: open reports and the latest threads, with hide / pin / delete / resolve.
// Service role after the is_admin check (requireAdmin); every action lands in admin_audit.
import type { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isModerationAction, type AdminCommunity, type AdminCommunityPost, type AdminCommunityReport, type ModerationKind } from "../../../../packages/shared/src/community/moderation.js";
import { excerpt } from "../../../../packages/shared/src/community/community.js";
import { audit, fail, requireAdmin } from "./admin.js";

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));

async function namesFor(db: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return new Map();
  const { data } = await db.from("profiles").select("id, name, email").in("id", uniq);
  return new Map((data ?? []).map((p) => [p.id as string, ((p.name as string) || (p.email as string)) ?? "Someone"]));
}

export const handleAdminCommunity: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const db = ctx.db;
    const [reportsQ, postsQ, counts] = await Promise.all([
      db.from("community_reports").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(200),
      db.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100),
      Promise.all([
        db.from("community_posts").select("id", { count: "exact", head: true }),
        db.from("community_replies").select("id", { count: "exact", head: true }),
        db.from("community_reports").select("id", { count: "exact", head: true }).is("resolved_at", null),
        db.from("community_posts").select("id", { count: "exact", head: true }).not("hidden_at", "is", null),
      ]),
    ]);
    if (reportsQ.error) throw reportsQ.error;
    if (postsQ.error) throw postsQ.error;
    const reports = (reportsQ.data ?? []) as Row[];
    const posts = (postsQ.data ?? []) as Row[];

    const reportedPostIds = reports.map((r) => r.post_id as string | null).filter((x): x is string => !!x);
    const reportedReplyIds = reports.map((r) => r.reply_id as string | null).filter((x): x is string => !!x);
    const postIds = posts.map((p) => p.id as string);

    const [extraPosts, repliesForReports, replyRows, reportRows] = await Promise.all([
      reportedPostIds.filter((id) => !postIds.includes(id)).length
        ? db.from("community_posts").select("*").in("id", reportedPostIds.filter((id) => !postIds.includes(id)))
        : Promise.resolve({ data: [] as Row[] }),
      reportedReplyIds.length ? db.from("community_replies").select("*").in("id", reportedReplyIds) : Promise.resolve({ data: [] as Row[] }),
      postIds.length ? db.from("community_replies").select("post_id").in("post_id", postIds).is("hidden_at", null) : Promise.resolve({ data: [] as Row[] }),
      postIds.length ? db.from("community_reports").select("post_id").in("post_id", postIds).is("resolved_at", null) : Promise.resolve({ data: [] as Row[] }),
    ]);

    const postById = new Map<string, Row>([...posts, ...((extraPosts.data ?? []) as Row[])].map((p) => [p.id as string, p]));
    const replyById = new Map<string, Row>(((repliesForReports.data ?? []) as Row[]).map((r) => [r.id as string, r]));
    const replyCount = new Map<string, number>();
    for (const r of (replyRows.data ?? []) as Row[]) replyCount.set(r.post_id as string, (replyCount.get(r.post_id as string) ?? 0) + 1);
    const reportCount = new Map<string, number>();
    for (const r of (reportRows.data ?? []) as Row[]) reportCount.set(r.post_id as string, (reportCount.get(r.post_id as string) ?? 0) + 1);

    const names = await namesFor(db, [
      ...posts.map((p) => p.author_id as string),
      ...[...postById.values()].map((p) => p.author_id as string),
      ...[...replyById.values()].map((r) => r.author_id as string),
      ...reports.map((r) => r.reporter_id as string),
    ]);

    const outPosts: AdminCommunityPost[] = posts.map((p) => ({
      id: p.id as string,
      title: p.title as string,
      excerpt: excerpt(p.body as string, 140),
      make: p.make as string,
      model: str(p.model),
      author: names.get(p.author_id as string) ?? "Someone",
      authorId: p.author_id as string,
      createdAt: p.created_at as string,
      replies: replyCount.get(p.id as string) ?? 0,
      reports: reportCount.get(p.id as string) ?? 0,
      pinned: !!p.pinned,
      hiddenAt: str(p.hidden_at),
      hiddenReason: str(p.hidden_reason),
    }));

    const outReports: AdminCommunityReport[] = reports.map((r) => {
      const kind: "post" | "reply" = r.post_id ? "post" : "reply";
      const target = kind === "post" ? postById.get(r.post_id as string) : replyById.get(r.reply_id as string);
      return {
        id: r.id as string,
        kind,
        targetId: (kind === "post" ? r.post_id : r.reply_id) as string,
        postId: kind === "post" ? (r.post_id as string) : ((target?.post_id as string | undefined) ?? null),
        reason: r.reason as string,
        reporter: names.get(r.reporter_id as string) ?? "Someone",
        createdAt: r.created_at as string,
        excerpt: target ? excerpt(kind === "post" ? `${target.title}: ${target.body}` : (target.body as string), 160) : null,
        author: target ? (names.get(target.author_id as string) ?? "Someone") : null,
        hidden: !!target?.hidden_at,
      };
    });

    const body: AdminCommunity = {
      reports: outReports,
      posts: outPosts,
      totals: {
        posts: counts[0].count ?? 0,
        replies: counts[1].count ?? 0,
        openReports: counts[2].count ?? 0,
        hidden: counts[3].count ?? 0,
      },
    };
    res.json(body);
  } catch (e) {
    fail(res, e);
  }
};

export const handleAdminCommunityAction: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const kind = String(req.params.kind) as ModerationKind;
  const id = String(req.params.id);
  const action = String((req.body as { action?: unknown })?.action ?? "");
  const reason = String((req.body as { reason?: unknown })?.reason ?? "").slice(0, 300) || null;
  if (!isModerationAction(kind, action)) {
    res.status(400).json({ error: "Unknown action." });
    return;
  }
  try {
    const db = ctx.db;
    const table = kind === "post" ? "community_posts" : kind === "reply" ? "community_replies" : "community_reports";
    const { data: before } = await db.from(table).select("*").eq("id", id).maybeSingle();
    if (!before) {
      res.status(404).json({ error: "Not found." });
      return;
    }
    const label = kind === "post" ? String(before.title) : kind === "reply" ? excerpt(String(before.body), 60) : `report on ${before.post_id ? "post" : "reply"}`;
    let q;
    switch (action) {
      case "hide":
        q = db.from(table).update({ hidden_at: new Date().toISOString(), hidden_reason: reason ?? "Hidden by Bosun" }).eq("id", id);
        break;
      case "unhide":
        q = db.from(table).update({ hidden_at: null, hidden_reason: null }).eq("id", id);
        break;
      case "pin":
      case "unpin":
        q = db.from(table).update({ pinned: action === "pin" }).eq("id", id);
        break;
      case "delete":
        q = db.from(table).delete().eq("id", id);
        break;
      case "resolve":
        q = db.from(table).update({ resolved_at: new Date().toISOString(), resolved_by: ctx.admin.id }).eq("id", id);
        break;
    }
    const { error } = await q;
    if (error) throw error;
    // Hiding or deleting something settles the flags on it.
    if ((action === "hide" || action === "delete") && kind !== "report") {
      await db.from("community_reports").update({ resolved_at: new Date().toISOString(), resolved_by: ctx.admin.id })
        .eq(kind === "post" ? "post_id" : "reply_id", id).is("resolved_at", null);
    }
    await audit(ctx, `community:${kind}:${action}`, id, label, reason ? { reason } : {});
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
};
