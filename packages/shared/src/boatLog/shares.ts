// Shareable service history: one live link per boat, costs off by default, revocable.
// The public page reads only through public_boat_history() (no notes, no owner, no invoices).

import type { Db } from "../db/client";
import type { SharedHistory } from "../boatLog";

export interface HistoryShare {
  id: string;
  token: string;
  showCosts: boolean;
  createdAt: string;
}

export const SHARE_PATH = "/history/";

/** `${origin}/history/${token}`; the web passes window.location.origin, the app the site URL. */
export function historyShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}${SHARE_PATH}${token}`;
}

const map = (d: { id: string; token: string; show_costs: boolean; created_at: string }): HistoryShare => ({
  id: d.id,
  token: d.token,
  showCosts: d.show_costs,
  createdAt: d.created_at,
});

/** The boat's live link, if any (newest unrevoked). */
export async function getHistoryShare(client: Db, boatId: string): Promise<HistoryShare | null> {
  const { data, error } = await client
    .from("boat_history_shares")
    .select("*")
    .eq("boat_id", boatId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}

export async function createHistoryShare(client: Db, ownerId: string, boatId: string, showCosts: boolean): Promise<HistoryShare> {
  const { data, error } = await client.from("boat_history_shares").insert({ boat_id: boatId, owner_id: ownerId, show_costs: showCosts }).select().single();
  if (error) throw error;
  return map(data);
}

export async function setHistoryShareCosts(client: Db, shareId: string, showCosts: boolean): Promise<void> {
  const { error } = await client.from("boat_history_shares").update({ show_costs: showCosts }).eq("id", shareId);
  if (error) throw error;
}

/** Turns the link off. Anyone who has it sees "no longer shared"; a new link gets a new token. */
export async function revokeHistoryShare(client: Db, shareId: string): Promise<void> {
  const { error } = await client.from("boat_history_shares").update({ revoked_at: new Date().toISOString() }).eq("id", shareId);
  if (error) throw error;
}

/** Public, no login: the history behind a link, or null when the token is unknown or revoked. */
export async function publicHistory(client: Db, token: string): Promise<SharedHistory | null> {
  const { data, error } = await client.rpc("public_boat_history", { share_token: token });
  if (error) throw error;
  return (data as unknown as SharedHistory | null) ?? null;
}
