// Pure helpers for editing work orders and shipments: blank drafts, numbering, the invoice text.

import { workOrderTotals, type PartsShipment, type WorkOrder, type WorkOrderStatus } from "../shop";
import type { ShopSettings } from "./settings";

export type WorkOrderDraft = Omit<WorkOrder, "id" | "createdAt" | "completedAt" | "exportedAt"> & { id?: string };
export type ShipmentDraft = Omit<PartsShipment, "id" | "createdAt" | "receivedAt"> & { id?: string };

/** Statuses that count as finished work (the logbook trigger fires on these). */
export const DONE_STATUSES: WorkOrderStatus[] = ["completed", "invoiced"];

/** WO-1001, WO-1002, … one past the highest number on the board. */
export function nextWorkOrderNumber(orders: Pick<WorkOrder, "number">[]): string {
  const max = orders.reduce((m, o) => {
    const n = Number(o.number.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return `WO-${max + 1}`;
}

/** A new order: tomorrow 8–12 in the first bay with the first tech, one labor line at the shop rate. */
export function blankWorkOrder(number: string, settings: ShopSettings, now: Date = new Date()): WorkOrderDraft {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12);
  return {
    number,
    title: "",
    description: "",
    status: "scheduled",
    customerName: "",
    customerEmail: "",
    boatLabel: "",
    boatId: null,
    projectId: null,
    assignedTo: settings.techs[0] ?? "",
    bay: settings.bays[0] ?? "",
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    engineHours: null,
    taxRate: settings.taxRate,
    lines: [{ kind: "labor", description: "Labor", quantity: 1, unitPrice: settings.laborRate }],
  };
}

export function draftFromOrder(o: WorkOrder): WorkOrderDraft {
  const { createdAt: _c, completedAt: _d, exportedAt: _e, ...rest } = o;
  return rest;
}

export function blankShipment(): ShipmentDraft {
  return {
    supplier: "",
    description: "",
    carrier: "UPS",
    trackingNumber: "",
    status: "ordered",
    eta: null,
    workOrderId: null,
    boatLabel: "",
    customerName: "",
    inventoryItemId: null,
    quantity: 1,
    source: "manual",
    emailSubject: null,
  };
}

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** The plain-text invoice a shop emails or shares with the customer. */
export function invoiceText(order: WorkOrder, shopName: string): { subject: string; body: string } {
  const t = workOrderTotals(order.lines, order.taxRate);
  const lines = order.lines.map((l) => `${l.description} — ${l.quantity} × ${money(l.unitPrice)} = ${money(l.quantity * l.unitPrice)}`).join("\n");
  const body =
    `Hi ${order.customerName.split(" ")[0] || "there"},\n\n` +
    `Here's the invoice for ${order.title}${order.boatLabel ? ` on ${order.boatLabel}` : ""}.\n\n` +
    `${lines}\n\nSubtotal ${money(t.subtotal)}${t.tax ? `\nTax ${money(t.tax)}` : ""}\nTotal due ${money(t.total)}\n\n` +
    `${order.description ? `Notes: ${order.description}\n\n` : ""}Thank you,\n${shopName}`;
  return { subject: `Invoice ${order.number} from ${shopName}`, body };
}

/** A tech's note appended to the order's description, stamped with the day and their name. */
export function appendTechNote(description: string, techName: string, note: string, now: Date = new Date()): string {
  const clean = note.trim();
  if (!clean) return description;
  const stamp = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return [description.trim(), `${stamp} (${techName}): ${clean}`].filter(Boolean).join("\n");
}
