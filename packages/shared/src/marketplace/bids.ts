import type { Db } from "../db/client";
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

/**
 * Accept a bid: flag the bid, then point the job at it with the booking details in metadata.
 * (Two writes, no transaction; an `accept_bid` RPC replaces this in the backend phase.)
 */
export async function acceptBid(
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
