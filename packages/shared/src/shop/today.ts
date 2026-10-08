// The vendor's Today screen: the numbers and lists on top of shopAlerts(). Pure; both apps draw it.

import { billingStep, occupiesDay, shipmentBoatKey, toLocalDateKey, workOrderTotals, type PartsShipment, type WorkOrder } from "../shop";
import type { Project } from "../marketplace/types";

export interface BoardColumn {
  key: string;
  label: "Today" | "Tomorrow";
  list: WorkOrder[];
}

/** Today's and tomorrow's jobs, invoiced ones dropped, in start order. */
export function todayBoard(orders: WorkOrder[], now: Date = new Date()): [BoardColumn, BoardColumn] {
  const todayKey = toLocalDateKey(now.toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow.toISOString());
  const active = orders.filter((o) => o.status !== "invoiced");
  const byStart = (a: WorkOrder, b: WorkOrder) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "");
  return [
    { key: todayKey, label: "Today", list: active.filter((o) => occupiesDay(o, todayKey)).sort(byStart) },
    { key: tomorrowKey, label: "Tomorrow", list: active.filter((o) => occupiesDay(o, tomorrowKey) && o.status !== "completed").sort(byStart) },
  ];
}

/** Shipments due today (out for delivery, or ETA today or earlier), grouped by boat; shop stock last. */
export function arrivingToday(shipments: PartsShipment[], now: Date = new Date()): [string, PartsShipment[]][] {
  const todayKey = toLocalDateKey(now.toISOString());
  const due = shipments.filter((s) => !s.receivedAt && (s.status === "out-for-delivery" || (s.eta !== null && s.eta <= todayKey)));
  const groups = new Map<string, PartsShipment[]>();
  for (const s of due) groups.set(shipmentBoatKey(s), [...(groups.get(shipmentBoatKey(s)) ?? []), s]);
  return [...groups.entries()].sort(([a], [b]) => (a === "stock" ? 1 : b === "stock" ? -1 : 0));
}

export interface ShopMoney {
  /** Completed in the last 7 days. */
  week: number;
  /** Completed but not invoiced yet. */
  ready: number;
  /** Invoiced but unpaid. */
  owed: number;
  /** Paid this calendar month. */
  paidMonth: number;
  /** Exported to QuickBooks this calendar month. */
  sentMonth: number;
}

export function shopMoney(orders: WorkOrder[], now: Date = new Date()): ShopMoney {
  const weekAgo = now.getTime() - 7 * 86400_000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const out: ShopMoney = { week: 0, ready: 0, owed: 0, paidMonth: 0, sentMonth: 0 };
  for (const o of orders) {
    if (o.status !== "completed" && o.status !== "invoiced") continue;
    const total = workOrderTotals(o.lines, o.taxRate).total;
    const done = Date.parse(o.completedAt ?? o.createdAt);
    if (done >= weekAgo) out.week += total;
    const step = billingStep(o);
    if (step === "invoice") out.ready += total;
    if (step === "collect") out.owed += total;
    if (o.paidAt && Date.parse(o.paidAt) >= monthStart) out.paidMonth += total;
    if (o.exportedAt && Date.parse(o.exportedAt) >= monthStart) out.sentMonth += total;
  }
  return out;
}

/** Jobs this shop won on Bosun that aren't finished and have no work order yet. */
export function wonJobsNotOnBoard(bidJobs: Project[], orders: Pick<WorkOrder, "projectId">[], vendorId: string): Project[] {
  const linked = new Set(orders.map((o) => o.projectId).filter(Boolean));
  return bidJobs.filter(
    (p) =>
      !!p.chosenBidId &&
      p.status !== "completed" &&
      !linked.has(p.id) &&
      p.bids.some((b) => b.id === p.chosenBidId && (b.vendorProfileId === vendorId || b.vendorName === vendorId)),
  );
}

/** Jobs this shop won on Bosun, with what was quoted. */
export function bookedJobs(bidJobs: Project[], vendorId: string): { project: Project; price: number }[] {
  return bidJobs.flatMap((p) => {
    const bid = p.bids.find((b) => b.id === p.chosenBidId && b.vendorProfileId === vendorId);
    return bid ? [{ project: p, price: bid.price }] : [];
  });
}
