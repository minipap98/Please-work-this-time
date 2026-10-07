// Reviews of a shop: public to read, one per job per reviewer. Reviewer names come from
// profile_cards() because profiles are private.

import type { Db } from "../db/client";
import type { Tables } from "../database.types";

export interface VendorReview {
  id: string;
  projectId: string;
  reviewerId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  reviewer: { name: string; initials: string | null; avatarUrl: string | null } | null;
}

export async function listVendorReviews(client: Db, vendorId: string): Promise<VendorReview[]> {
  const { data, error } = await client.from("reviews").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.reviewer_id).filter(Boolean))];
  const cards = ids.length ? (await client.rpc("profile_cards", { ids })).data ?? [] : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  return rows.map((r) => {
    const c = byId.get(r.reviewer_id);
    return {
      id: r.id,
      projectId: r.project_id,
      reviewerId: r.reviewer_id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.created_at,
      reviewer: c ? { name: c.name ?? "Anonymous", initials: c.initials ?? null, avatarUrl: c.avatar_url ?? null } : null,
    };
  });
}

export interface ReviewSummary {
  count: number;
  /** Mean stars to one decimal, or null with no reviews. */
  average: number | null;
}

export function reviewSummary(reviews: Pick<VendorReview, "stars">[]): ReviewSummary {
  if (!reviews.length) return { count: 0, average: null };
  const sum = reviews.reduce((n, r) => n + r.stars, 0);
  return { count: reviews.length, average: Math.round((sum / reviews.length) * 10) / 10 };
}

/** The signed-in owner's review of this job, if they left one. */
export async function getMyReview(client: Db, projectId: string, reviewerId: string): Promise<Tables<"reviews"> | null> {
  const { data, error } = await client.from("reviews").select("*").eq("project_id", projectId).eq("reviewer_id", reviewerId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface NewReview {
  projectId: string;
  /** vendor_profiles.id (the bid's vendorProfileId), never the shop's name. */
  vendorId: string;
  stars: number;
  comment: string;
}

export async function createReview(client: Db, reviewerId: string, review: NewReview): Promise<void> {
  if (review.stars < 1 || review.stars > 5) throw new Error("Pick 1 to 5 stars.");
  const { error } = await client.from("reviews").insert({
    project_id: review.projectId,
    vendor_id: review.vendorId,
    reviewer_id: reviewerId,
    stars: review.stars,
    comment: review.comment.trim() || null,
  });
  if (error) {
    if (error.code === "23505") throw new Error("You've already reviewed this job.");
    throw error;
  }
}

export const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"] as const;
