import type { Db } from "../db/client";
import { isMissingColumn } from "../db/optionalColumns";
import type { ProjectStatus } from "./types";

export interface BidLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface SubmitBidInput {
  projectId: string;
  vendorProfileId: string;
  price: number;
  message: string;
  /** "YYYY-MM-DD" from a date picker, or an ISO timestamp. */
  expiryDate?: string;
  lineItems: BidLineItemInput[];
}

/** Rules a bid must meet before it's sent. Returns the message to show, or null when fine. */
export function bidProblem(input: Pick<SubmitBidInput, "price" | "message">): string | null {
  if (!(input.price > 0)) return "Bid total must be greater than $0.";
  if (!input.message.trim()) return "Add a short message with your bid.";
  return null;
}

/** A date from the picker (YYYY-MM-DD) means "good through the end of that day" (local time). */
export function normalizeBidExpiry(expiryDate: string | undefined): string | null {
  if (!expiryDate) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ? new Date(`${expiryDate}T23:59:59`).toISOString()
    : expiryDate;
}

/** Line items worth saving: a description and a price. Quantity defaults to 1. */
export function usableLineItems(items: BidLineItemInput[]): BidLineItemInput[] {
  return items
    .filter((li) => li.description.trim() && li.unitPrice > 0)
    .map((li) => ({ description: li.description.trim(), quantity: li.quantity || 1, unitPrice: li.unitPrice }));
}

export async function submitBid(client: Db, input: SubmitBidInput): Promise<void> {
  const problem = bidProblem(input);
  if (problem) throw new Error(problem);

  const { data: bid, error } = await client
    .from("bids")
    .insert({
      project_id: input.projectId,
      vendor_id: input.vendorProfileId,
      price: input.price,
      message: input.message.trim(),
      expiry_date: normalizeBidExpiry(input.expiryDate),
    })
    .select("id")
    .single();
  if (error) throw error;

  const items = usableLineItems(input.lineItems);
  if (items.length) {
    const { error: liError } = await client.from("bid_line_items").insert(
      items.map((li, i) => ({
        bid_id: bid.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unitPrice,
        sort_order: i,
      })),
    );
    if (liError) throw liError;
  }
}

export async function updateProjectStatus(client: Db, projectId: string, status: ProjectStatus): Promise<void> {
  const { error } = await client.from("projects").update({ status }).eq("id", projectId);
  if (error) throw error;
}

/** PostgREST's "no such function" error: the migration that adds an RPC hasn't been run yet. */
export function isMissingFunction(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST202" || err.code === "42883" || /Could not find the function|function .* does not exist/i.test(err.message ?? "");
}

/**
 * Accept a bid through the `accept_bid` RPC: one transaction that checks the job is the
 * owner's and still open, that the bid is on it and live, flags the winner, rejects the rest
 * and moves the job to in-progress with the booking in metadata. Until that migration has run,
 * falls back to the original two writes.
 */
export async function acceptBid(
  client: Db,
  projectId: string,
  bidId: string,
  booking?: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.rpc("accept_bid", { p_project: projectId, p_bid: bidId, p_booking: (booking ?? null) as never });
  if (!error) return;
  if (!isMissingFunction(error)) throw error;
  await acceptBidLegacy(client, projectId, bidId, booking);
}

async function acceptBidLegacy(
  client: Db,
  projectId: string,
  bidId: string,
  booking?: Record<string, unknown>,
): Promise<void> {
  const { error: bidError } = await client.from("bids").update({ accepted: true }).eq("id", bidId);
  if (bidError) throw bidError;
  const { data: existing } = await client
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();
  const metadata = {
    ...(((existing as { metadata?: Record<string, unknown> } | null)?.metadata) ?? {}),
    booking: booking ?? null,
  };
  const { error } = await client
    .from("projects")
    .update({ chosen_bid_id: bidId, status: "in-progress", metadata } as never)
    .eq("id", projectId);
  if (error) throw error;
}

/** The owner opened the job: every bid on it has now been seen. Ignored until `bids.seen_at` exists. */
export async function markBidsSeen(client: Db, projectId: string): Promise<void> {
  const { error } = await client
    .from("bids")
    .update({ seen_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .is("seen_at", null);
  if (error && !isMissingColumn(error)) throw error;
}

/** Owner declines (or un-declines) a bid. The shop is told through the bid_rejected trigger. */
export async function setBidRejected(client: Db, bidId: string, rejected: boolean): Promise<void> {
  const { error } = await client.from("bids").update({ rejected }).eq("id", bidId);
  if (error) throw error;
}

/** Shop withdraws its bid. The row stays (the owner sees it crossed out) but can't be accepted. */
export async function withdrawBid(client: Db, bidId: string): Promise<void> {
  const { error } = await client.from("bids").update({ withdrawn_at: new Date().toISOString() }).eq("id", bidId);
  if (error) throw error;
}
