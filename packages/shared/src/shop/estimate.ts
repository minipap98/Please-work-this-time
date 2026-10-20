// Estimates: a work order quoted before the customer says yes. The shop sends a link; the customer
// approves or declines there with no account; approval moves the order to scheduled. Pure helpers
// for both apps and the public page. The reads and writes live in shop/data.ts.

import { parseBoatLabel, workOrderTotals, type WorkOrder, type WorkOrderLine } from "../shop";
import { EMPTY_BOAT_FORM, type BoatForm } from "../boats/boats";
import { money } from "./drafts";

export const ESTIMATE_PATH = "/estimate/";

/** How long a link answers after it was sent (respond_to_estimate() enforces the same). */
export const ESTIMATE_VALID_DAYS = 30;

/** `${origin}/estimate/${token}`; the web passes window.location.origin, the app the site URL. */
export function estimateUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}${ESTIMATE_PATH}${token}`;
}

export type EstimateStep = "draft" | "sent" | "approved" | "declined" | "expired";

type EstimateFields = Pick<WorkOrder, "status" | "estimateSentAt" | "estimateApprovedAt" | "estimateDeclinedAt">;

/**
 * Where an estimate stands. Null for an ordinary work order that was never quoted; "approved"
 * stays on after the order moves to scheduled so the editor can say who said yes and when. An
 * order the shop moved back to Estimate is being re-quoted, so its old approval doesn't count.
 */
export function estimateStep(o: EstimateFields, now: Date = new Date()): EstimateStep | null {
  if (o.status !== "estimate") return o.estimateApprovedAt ? "approved" : null;
  if (o.estimateDeclinedAt) return "declined";
  if (o.estimateSentAt) return isExpired(o.estimateSentAt, now) ? "expired" : "sent";
  return "draft";
}

export function estimateExpiry(sentAt: string): string {
  return new Date(Date.parse(sentAt) + ESTIMATE_VALID_DAYS * 86400_000).toISOString();
}

function isExpired(sentAt: string, now: Date): boolean {
  return Date.parse(estimateExpiry(sentAt)) < now.getTime();
}

/** What public_estimate() returns for a link: the quote as the customer sees it. */
export interface PublicEstimate {
  number: string;
  title: string;
  description: string;
  customerName: string;
  boatLabel: string;
  engineHours: number | null;
  taxRate: number;
  status: string;
  sentAt: string;
  expiresAt: string;
  approvedAt: string | null;
  declinedAt: string | null;
  note: string;
  shop: { name: string; phone: string | null; website: string | null; logoUrl: string | null; serviceArea: string | null };
  lines: WorkOrderLine[];
  /**
   * Set only for the signed-in owner who kept the job with their boat (public_estimate() answers
   * null to everyone else): which of their boats, and whether the Boat Log row exists yet (it's
   * written when the shop marks the order completed). Absent before 20261033 has run.
   */
  ownerBoatId?: string | null;
  filed?: boolean | null;
}

export type PublicEstimateState = "open" | "approved" | "declined" | "expired";

/** Which page the customer sees. A declined estimate can still be approved until it expires. */
export function publicEstimateState(e: Pick<PublicEstimate, "approvedAt" | "declinedAt" | "expiresAt">, now: Date = new Date()): PublicEstimateState {
  if (e.approvedAt) return "approved";
  if (Date.parse(e.expiresAt) < now.getTime()) return "expired";
  if (e.declinedAt) return "declined";
  return "open";
}

/** The email a shop sends with the link: the lines, the total, and where to approve. */
export function estimateText(
  order: Pick<WorkOrder, "number" | "title" | "customerName" | "boatLabel" | "description" | "lines" | "taxRate">,
  shopName: string,
  link: string,
): { subject: string; body: string } {
  const t = workOrderTotals(order.lines, order.taxRate);
  const lines = order.lines.map((l) => `${l.description} — ${l.quantity} × ${money(l.unitPrice)} = ${money(l.quantity * l.unitPrice)}`).join("\n");
  const body =
    `Hi ${order.customerName.split(" ")[0] || "there"},\n\n` +
    `Here's our estimate for ${order.title}${order.boatLabel ? ` on ${order.boatLabel}` : ""}.\n\n` +
    `${lines}\n\nSubtotal ${money(t.subtotal)}${t.tax ? `\nTax ${money(t.tax)}` : ""}\nEstimated total ${money(t.total)}\n\n` +
    `${order.description ? `Notes: ${order.description}\n\n` : ""}` +
    `Review and approve it here (good for ${ESTIMATE_VALID_DAYS} days):\n${link}\n\n` +
    `Reply to this email with any questions.\n\nThank you,\n${shopName}`;
  return { subject: `Estimate ${order.number} from ${shopName}`, body };
}

// ── Keeping the job with the owner's boat ────────────────────────────────────
// After approving, the customer can file the job to one of their own boats (shop_work_orders.
// owner_boat_id → boats). claim_estimate() does the write; once the shop completes the order the
// same vendor-verified Boat Log row a Bosun job gets is written for that boat.

export type EstimateClaimStep =
  /** Nothing to keep yet: the estimate hasn't been approved and the job isn't done. */
  | "approve-first"
  /** Approved; the reader has no session, so offer login / signup that returns here. */
  | "sign-in"
  /** Signed in; pick one of my boats or add one. */
  | "pick-boat"
  /** Kept with a boat; the log row lands when the shop marks the job complete. */
  | "kept"
  /** Kept and the Boat Log row exists. */
  | "filed";

/** Where the "Keep this job with your boat" block stands for this reader. */
export function estimateClaimStep(
  e: Pick<PublicEstimate, "approvedAt" | "status" | "ownerBoatId" | "filed">,
  signedIn: boolean,
): EstimateClaimStep {
  if (e.ownerBoatId) return e.filed ? "filed" : "kept";
  if (!e.approvedAt && !isDoneStatus(e.status)) return "approve-first";
  if (!signedIn) return "sign-in";
  return "pick-boat";
}

function isDoneStatus(status: string): boolean {
  return status === "completed" || status === "invoiced";
}

/** The login page that comes back to this estimate afterwards (`mode=signup` opens the sign-up tab). */
export function estimateLoginPath(token: string, mode: "signin" | "signup" = "signin"): string {
  const next = encodeURIComponent(`${ESTIMATE_PATH}${token}`);
  return mode === "signup" ? `/login?mode=signup&next=${next}` : `/login?next=${next}`;
}

/**
 * A new boat prefilled from the shop's label ("2019 Pursuit S 288 · Reel Time"): year, make, model
 * and name when the label carries them; everything else blank for the owner to fill in later.
 */
export function boatFormFromEstimateLabel(label: string): BoatForm {
  const p = parseBoatLabel(label ?? "");
  return { ...EMPTY_BOAT_FORM, name: p.name, year: p.year ? String(p.year) : "", make: p.make, model: p.model };
}

/** What pending_estimate_claims() returns: approved or completed estimate jobs addressed to my email, not filed yet. */
export interface PendingEstimateClaim {
  token: string;
  number: string;
  title: string;
  shopName: string;
  boatLabel: string;
  approvedAt: string | null;
  completedAt: string | null;
}

/** One line under the job on the "waiting to be filed" strip: shop, the shop's boat label, and where it stands. */
export function pendingClaimSummary(c: Pick<PendingEstimateClaim, "shopName" | "boatLabel" | "approvedAt" | "completedAt">): string {
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const state = c.completedAt ? `completed ${when(c.completedAt)}` : c.approvedAt ? `approved ${when(c.approvedAt)}` : null;
  return [c.shopName, c.boatLabel, state].filter(Boolean).join(" · ");
}

/**
 * Which boat a pending job most likely belongs to: the one whose name or year/make/model the
 * shop's label mentions, else the active boat, else the first.
 */
export function pickClaimBoat<T extends { id: string; name: string | null; label?: string }>(
  c: Pick<PendingEstimateClaim, "boatLabel">,
  boats: T[],
  activeId: string | null | undefined,
): T | null {
  const label = (c.boatLabel ?? "").toLowerCase();
  if (label) {
    const hit = boats.find((b) => [b.name, b.label].some((s) => s && s.trim() && label.includes(s.toLowerCase())));
    if (hit) return hit;
  }
  return boats.find((b) => b.id === activeId) ?? boats[0] ?? null;
}
