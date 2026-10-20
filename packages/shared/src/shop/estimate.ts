// Estimates: a work order quoted before the customer says yes. The shop sends a link; the customer
// approves or declines there with no account; approval moves the order to scheduled. Pure helpers
// for both apps and the public page. The reads and writes live in shop/data.ts.

import { workOrderTotals, type WorkOrder, type WorkOrderLine } from "../shop";
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
