// Emailed receipts waiting for the owner's review (receipt_inbox). The server files them; the
// owner reviews each one (same flow as an invoice import) or dismisses it.

import type { Db } from "../db/client";
import { normalizeInvoice, type ExtractedInvoice } from "../invoice";

export interface InboxReceipt {
  id: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  extracted: ExtractedInvoice | null;
  readError: string | null;
  /** Filed but Claude hasn't finished reading it yet (takes 10–30 s after the email arrives). */
  reading: boolean;
}

export async function listReceiptInbox(client: Db, ownerId: string): Promise<InboxReceipt[]> {
  const { data, error } = await client.from("receipt_inbox").select("*").eq("owner_id", ownerId).eq("status", "pending").order("received_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fromEmail: r.from_email,
    subject: r.subject,
    receivedAt: r.received_at,
    attachmentPath: r.attachment_path,
    attachmentName: r.attachment_name,
    extracted: r.extracted ? normalizeInvoice(r.extracted) : null,
    readError: r.read_error,
    reading: !r.extracted && !r.read_error,
  }));
}

export async function resolveReceipt(client: Db, id: string, status: "added" | "dismissed"): Promise<void> {
  const { error } = await client.from("receipt_inbox").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** The boat a receipt most likely belongs to: the one it names, else the active boat, else the first. */
export function pickReceiptBoat<T extends { id: string; name: string | null; label?: string }>(
  receipt: Pick<InboxReceipt, "extracted">,
  boats: T[],
  activeId: string | null | undefined,
): T | null {
  const named = (receipt.extracted?.boat ?? "").toLowerCase();
  if (named) {
    const hit = boats.find((b) => [b.name, b.label].some((s) => s && s.trim() && named.includes(s.toLowerCase())));
    if (hit) return hit;
  }
  return boats.find((b) => b.id === activeId) ?? boats[0] ?? null;
}

/** The address owners forward receipts to, or null when inbound mail isn't set up. */
export function receiptsAddress(inboundDomain: string | null | undefined): string | null {
  return inboundDomain ? `receipts@${inboundDomain}` : null;
}
