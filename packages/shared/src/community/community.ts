// Owners' community: threads for people who own the same boats. A group is a make ("Pursuit
// owners") or a make + model ("Pursuit DC 326 owners"); your boats put you in groups, nobody
// creates them. Only owner accounts take part; the database (20261030_community.sql) enforces
// who may post where, and everything here reads through its RPCs.

import type { Db } from "../db/client";
import { dataUrlToBytes, type PhotoInput } from "../marketplace/photos";

export const POST_TITLE_MIN = 3;
export const POST_TITLE_MAX = 140;
export const POST_BODY_MAX = 5000;
export const REPLY_BODY_MAX = 3000;
export const REPORT_REASON_MAX = 500;
export const POSTS_PER_DAY = 10;

export const OWNERS_PATH = "/owners";

export interface CommunityAuthor {
  id: string;
  /** "Dean M." — first name and last initial, like profile_cards(). */
  name: string;
  initials: string;
  avatarUrl: string | null;
}

export interface CommunityGroupRef {
  make: string;
  model: string | null;
  makeKey: string;
  modelKey: string | null;
}

export interface CommunityGroup extends CommunityGroupRef {
  /** Owners on Bosun with such a boat. */
  owners: number;
  posts: number;
}

export interface CommunityPost extends CommunityGroupRef {
  id: string;
  title: string;
  body: string;
  photoUrl: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  replies: number;
  lastReplyAt: string | null;
  author: CommunityAuthor;
  /** "2021 Pursuit DC 326 · 2× Yamaha F300", or null when the author has no boat on file. */
  authorBoat: string | null;
  mine: boolean;
}

export interface CommunityReply {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
  authorBoat: string | null;
  mine: boolean;
}

export interface CommunityFeed {
  group: CommunityGroup & { canPost: boolean };
  posts: CommunityPost[];
}

export interface CommunityThread {
  post: CommunityPost;
  replies: CommunityReply[];
  canReply: boolean;
}

export interface NewPost {
  make: string;
  model: string | null;
  title: string;
  body: string;
  boatId?: string | null;
  photoUrl?: string | null;
}

/** "Sea Ray" → "sea-ray", "DC 326" → "dc-326". Mirrors community_key() in SQL. */
export function communityKey(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A make or model that can't form a group (blank, or the "Unknown" placeholder). */
export function isGroupable(make: string | null | undefined, model?: string | null): boolean {
  const mk = communityKey(make);
  if (mk === "" || mk === "unknown") return false;
  if (model === undefined || model === null) return true;
  const md = communityKey(model);
  return md !== "" && md !== "unknown";
}

/** `/owners/pursuit` or `/owners/pursuit/dc-326`. Takes keys or display names. */
export function groupPath(make: string, model?: string | null): string {
  const mk = communityKey(make);
  const md = model ? communityKey(model) : "";
  return md ? `${OWNERS_PATH}/${mk}/${md}` : `${OWNERS_PATH}/${mk}`;
}

export function postPath(id: string): string {
  return `${OWNERS_PATH}/post/${id}`;
}

/** "Pursuit DC 326 owners" / "Pursuit owners". */
export function groupLabel(g: { make: string; model: string | null }): string {
  return `${g.model ? `${g.make} ${g.model}` : g.make} owners`;
}

/** "pursuit" → "Pursuit", "dc-326" → "Dc 326": a readable stand-in until the server names the group. */
export function titleFromKey(key: string): string {
  return key
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** The first ~n characters of a body on one line, for list rows. */
export function excerpt(body: string, n = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length <= n ? flat : `${flat.slice(0, n - 1).trimEnd()}…`;
}

/** Why a post can't be saved, or null when it can. */
export function postProblem(input: { title: string; body: string }): string | null {
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < POST_TITLE_MIN) return "Give the thread a title.";
  if (title.length > POST_TITLE_MAX) return `Keep the title under ${POST_TITLE_MAX} characters.`;
  if (!body) return "Write something for other owners to read.";
  if (body.length > POST_BODY_MAX) return `Keep it under ${POST_BODY_MAX.toLocaleString("en-US")} characters.`;
  return null;
}

export function replyProblem(body: string): string | null {
  const b = body.trim();
  if (!b) return "Write a reply first.";
  if (b.length > REPLY_BODY_MAX) return `Keep it under ${REPLY_BODY_MAX.toLocaleString("en-US")} characters.`;
  return null;
}

/** Newest activity first: a reply counts as activity. */
export function lastActivity(p: Pick<CommunityPost, "createdAt" | "lastReplyAt">): string {
  return p.lastReplyAt && p.lastReplyAt > p.createdAt ? p.lastReplyAt : p.createdAt;
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

/** One group's board. `model` null shows the whole make, model threads included. Null when the caller isn't an owner. */
export async function communityFeed(client: Db, make: string, model: string | null, limit = 50): Promise<CommunityFeed | null> {
  const { data, error } = await client.rpc("community_feed", { p_make: make, p_model: model, p_limit: limit });
  if (error) throw error;
  return (data as unknown as CommunityFeed | null) ?? null;
}

/** A thread with its replies; null when it's gone, hidden, or the caller isn't an owner. */
export async function communityThread(client: Db, postId: string): Promise<CommunityThread | null> {
  const { data, error } = await client.rpc("community_thread", { p_post: postId });
  if (error) throw error;
  return (data as unknown as CommunityThread | null) ?? null;
}

/** The groups my boats put me in. */
export async function myCommunityGroups(client: Db): Promise<CommunityGroup[]> {
  const { data, error } = await client.rpc("community_my_groups");
  if (error) throw error;
  return (data as unknown as CommunityGroup[] | null) ?? [];
}

/** The busiest groups across Bosun. */
export async function activeCommunityGroups(client: Db, limit = 20): Promise<CommunityGroup[]> {
  const { data, error } = await client.rpc("community_active_groups", { p_limit: limit });
  if (error) throw error;
  return (data as unknown as CommunityGroup[] | null) ?? [];
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

export async function createPost(client: Db, authorId: string, input: NewPost): Promise<string> {
  const problem = postProblem(input);
  if (problem) throw new Error(problem);
  const { data, error } = await client
    .from("community_posts")
    .insert({
      author_id: authorId,
      make: input.make.trim(),
      model: input.model?.trim() || null,
      title: input.title.trim(),
      body: input.body.trim(),
      boat_id: input.boatId ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updatePost(client: Db, id: string, patch: { title?: string; body?: string; photoUrl?: string | null }): Promise<void> {
  const row: { title?: string; body?: string; photo_url?: string | null } = {};
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.body !== undefined) row.body = patch.body.trim();
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  const { error } = await client.from("community_posts").update(row).eq("id", id);
  if (error) throw error;
}

export async function deletePost(client: Db, id: string): Promise<void> {
  const { error } = await client.from("community_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function createReply(client: Db, authorId: string, postId: string, body: string): Promise<string> {
  const problem = replyProblem(body);
  if (problem) throw new Error(problem);
  const { data, error } = await client
    .from("community_replies")
    .insert({ post_id: postId, author_id: authorId, body: body.trim() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteReply(client: Db, id: string): Promise<void> {
  const { error } = await client.from("community_replies").delete().eq("id", id);
  if (error) throw error;
}

/** Flag a post or a reply for the Bosun team. */
export async function reportContent(client: Db, reporterId: string, target: { postId: string } | { replyId: string }, reason: string): Promise<void> {
  const r = reason.trim().slice(0, REPORT_REASON_MAX) || "Reported";
  const { error } = await client.from("community_reports").insert({
    reporter_id: reporterId,
    post_id: "postId" in target ? target.postId : null,
    reply_id: "replyId" in target ? target.replyId : null,
    reason: r,
  });
  if (error) throw error;
}

/** Upload a (resized) photo for a post to the public community-photos bucket and return its URL. */
export async function uploadCommunityPhoto(client: Db, ownerId: string, photo: PhotoInput): Promise<string> {
  const file = typeof photo === "string" ? dataUrlToBytes(photo) : photo;
  const path = `${ownerId}/${Date.now()}.jpg`;
  const { error } = await client.storage.from("community-photos").upload(path, file.bytes, { contentType: file.contentType });
  if (error) throw error;
  return client.storage.from("community-photos").getPublicUrl(path).data.publicUrl;
}
