// Estimate jobs the owner keeps with their own boat. The shop quotes a phoned-in job and the
// customer approves it from /estimate/:token; these calls file that order to one of the owner's
// boats so the shop's completed record lands in the Boat Log. Everything goes through
// security-definer functions (20261033_estimate_boat_log.sql): the owner never reads
// shop_work_orders directly and the shop learns nothing new about the owner.

import type { Db } from "../db/client";
import type { PendingEstimateClaim } from "../shop/estimate";

export interface EstimateClaimResult {
  boatId: string;
  /** True when the Boat Log row exists now (the order was already completed). */
  filed: boolean;
}

/** Keep the estimate behind `token` with `boatId` (one of mine, and the order must be addressed to my account's email). */
export async function claimEstimate(client: Db, token: string, boatId: string): Promise<EstimateClaimResult> {
  const { data, error } = await client.rpc("claim_estimate", { p_token: token, p_boat: boatId });
  if (error) throw error;
  const r = (data ?? {}) as { boatId?: string; filed?: boolean };
  return { boatId: r.boatId ?? boatId, filed: !!r.filed };
}

/**
 * Files every approved or completed estimate addressed to my email when I have exactly one boat
 * (the database does the same the moment a first boat is added). Returns how many were filed.
 */
export async function claimMyEstimates(client: Db): Promise<number> {
  const { data, error } = await client.rpc("claim_my_estimates");
  if (error) throw error;
  return Number(data) || 0;
}

/** Approved or completed estimates addressed to my email that aren't with a boat yet: the "waiting to be filed" strip. */
export async function pendingEstimateClaims(client: Db): Promise<PendingEstimateClaim[]> {
  const { data, error } = await client.rpc("pending_estimate_claims");
  if (error) throw error;
  return ((data ?? []) as unknown as PendingEstimateClaim[]).filter((c) => !!c.token);
}
