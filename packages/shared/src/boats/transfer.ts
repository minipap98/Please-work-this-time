// Handing a boat to its new owner: the seller addresses a transfer to the buyer's email, shares the
// link, and the buyer accepts from their own account. The database does the move (accept_boat_transfer).

import type { Db } from "../db/client";

export type TransferStatus = "pending" | "accepted" | "cancelled" | "expired";

export interface BoatTransfer {
  id: string;
  token: string;
  boatId: string;
  toEmail: string;
  includeCosts: boolean;
  status: TransferStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

/** What the buyer sees before accepting. */
export interface TransferPreview {
  id: string;
  status: TransferStatus;
  toEmail: string;
  includeCosts: boolean;
  expiresAt: string;
  fromName: string | null;
  boat: { id: string; name: string; year: string; make: string; model: string; photoUrl: string | null; engine: string | null } | null;
  entries: number;
  verified: number;
}

export const TRANSFER_PATH = "/transfer/";
export const TRANSFER_DAYS = 30;

/** `${origin}/transfer/${token}`; the web passes window.location.origin, the app the site URL. */
export function transferUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}${TRANSFER_PATH}${token}`;
}

export function isTransferExpired(t: Pick<BoatTransfer, "status" | "expiresAt">, now: Date = new Date()): boolean {
  return t.status === "pending" && new Date(t.expiresAt).getTime() < now.getTime();
}

/** A pending transfer that hasn't run out. */
export function isTransferLive(t: Pick<BoatTransfer, "status" | "expiresAt">, now: Date = new Date()): boolean {
  return t.status === "pending" && !isTransferExpired(t, now);
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Why the signed-in person can't accept this transfer, or null when they can. */
export function transferProblem(preview: Pick<TransferPreview, "status" | "toEmail" | "expiresAt">, myEmail: string | null | undefined, now: Date = new Date()): string | null {
  if (preview.status === "accepted") return "This boat has already been transferred.";
  if (preview.status === "cancelled") return "The seller cancelled this transfer.";
  if (preview.status === "expired" || new Date(preview.expiresAt).getTime() < now.getTime()) return "This transfer link has expired. Ask the seller to send a new one.";
  if (!emailsMatch(preview.toEmail, myEmail)) return `This transfer was sent to ${preview.toEmail}. Sign in with that email to accept it.`;
  return null;
}

/** "ann@example.com" → "a***@example.com", for showing a buyer's address on the seller's screen. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}

const map = (d: { id: string; token: string; boat_id: string; to_email: string; include_costs: boolean; status: string; created_at: string; expires_at: string; accepted_at: string | null }): BoatTransfer => {
  const t: BoatTransfer = {
    id: d.id,
    token: d.token,
    boatId: d.boat_id,
    toEmail: d.to_email,
    includeCosts: d.include_costs,
    status: d.status as TransferStatus,
    createdAt: d.created_at,
    expiresAt: d.expires_at,
    acceptedAt: d.accepted_at,
  };
  return isTransferExpired(t) ? { ...t, status: "expired" } : t;
};

/** Transfers this seller started, newest first (every status, so a recent handover still shows). */
export async function listOutgoingTransfers(client: Db, ownerId: string): Promise<BoatTransfer[]> {
  const { data, error } = await client.from("boat_transfers").select("*").eq("from_owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(map);
}

/** Live transfers addressed to the signed-in account's email (RLS does the matching). */
export async function listIncomingTransfers(client: Db, ownerId: string): Promise<BoatTransfer[]> {
  const { data, error } = await client.from("boat_transfers").select("*").neq("from_owner_id", ownerId).eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(map).filter((t) => t.status === "pending");
}

export async function createBoatTransfer(client: Db, ownerId: string, input: { boatId: string; toEmail: string; includeCosts: boolean }): Promise<BoatTransfer> {
  const { data, error } = await client
    .from("boat_transfers")
    .insert({ boat_id: input.boatId, from_owner_id: ownerId, to_email: input.toEmail.trim().toLowerCase(), include_costs: input.includeCosts })
    .select()
    .single();
  if (error) throw error;
  return map(data);
}

export async function cancelBoatTransfer(client: Db, id: string): Promise<void> {
  const { error } = await client.from("boat_transfers").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
  if (error) throw error;
}

/** The boat behind a transfer link, for the buyer's screen; null when the token is unknown. */
export async function previewBoatTransfer(client: Db, token: string): Promise<TransferPreview | null> {
  const { data, error } = await client.rpc("boat_transfer_preview", { transfer_token: token });
  if (error) throw error;
  return (data as unknown as TransferPreview | null) ?? null;
}

/** Accept: the database checks the email, moves the boat and tells the seller. Returns the boat's id. */
export async function acceptBoatTransfer(client: Db, token: string): Promise<string> {
  const { data, error } = await client.rpc("accept_boat_transfer", { transfer_token: token });
  if (error) throw error;
  return (data as unknown as { boatId: string }).boatId;
}
