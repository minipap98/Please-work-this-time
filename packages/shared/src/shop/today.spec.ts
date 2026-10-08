import { describe, expect, it } from "vitest";
import type { Project } from "../marketplace/types";
import type { PartsShipment, WorkOrder } from "../shop";
import { arrivingToday, bookedJobs, shopMoney, todayBoard, wonJobsNotOnBoard } from "./today";

const now = new Date(2026, 9, 8, 10, 0); // Oct 8, 2026 10:00 local
const iso = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();

function wo(p: Partial<WorkOrder> & { id: string }): WorkOrder {
  return {
    number: `WO-${p.id}`,
    title: p.id,
    description: "",
    status: "scheduled",
    customerName: "",
    customerEmail: "",
    boatLabel: "",
    assignedTo: "",
    bay: "",
    scheduledStart: null,
    scheduledEnd: null,
    engineHours: null,
    taxRate: 0,
    completedAt: null,
    exportedAt: null,
    createdAt: iso(1, 9),
    lines: [{ kind: "labor", description: "Labor", quantity: 1, unitPrice: 100 }],
    ...p,
  };
}

describe("todayBoard", () => {
  it("splits today and tomorrow, drops invoiced orders and finished ones from tomorrow", () => {
    const orders = [
      wo({ id: "late", scheduledStart: iso(8, 14), scheduledEnd: iso(8, 16) }),
      wo({ id: "early", scheduledStart: iso(8, 8), scheduledEnd: iso(8, 10) }),
      wo({ id: "tmrw", scheduledStart: iso(9, 9), scheduledEnd: iso(9, 11) }),
      wo({ id: "tmrw-done", status: "completed", scheduledStart: iso(9, 9), scheduledEnd: iso(9, 11) }),
      wo({ id: "billed", status: "invoiced", scheduledStart: iso(8, 9), scheduledEnd: iso(8, 11) }),
    ];
    const [today, tomorrow] = todayBoard(orders, now);
    expect(today.label).toBe("Today");
    expect(today.list.map((o) => o.id)).toEqual(["early", "late"]);
    expect(tomorrow.list.map((o) => o.id)).toEqual(["tmrw"]);
  });
});

describe("arrivingToday", () => {
  const sh = (p: Partial<PartsShipment> & { id: string }): PartsShipment => ({
    supplier: "",
    description: "",
    carrier: "UPS",
    trackingNumber: "",
    status: "shipped",
    eta: null,
    workOrderId: null,
    boatLabel: "",
    customerName: "",
    inventoryItemId: null,
    quantity: 1,
    source: "manual",
    emailSubject: null,
    receivedAt: null,
    createdAt: iso(1, 9),
    ...p,
  });

  it("groups due shipments by boat with shop stock last", () => {
    const groups = arrivingToday(
      [
        sh({ id: "stock", status: "out-for-delivery" }),
        sh({ id: "boat", eta: "2026-10-07", boatLabel: "Reel Time", customerName: "Ann" }),
        sh({ id: "later", eta: "2026-10-12", boatLabel: "Reel Time" }),
        sh({ id: "in", eta: "2026-10-08", receivedAt: iso(8, 9) }),
      ],
      now,
    );
    expect(groups.map(([k, list]) => [k, list.map((s) => s.id)])).toEqual([
      ["boat:reel time", ["boat"]],
      ["stock", ["stock"]],
    ]);
  });
});

describe("shopMoney", () => {
  it("sums the week, the unbilled, the owed and this month's paid and exported totals", () => {
    const orders = [
      wo({ id: "done", status: "completed", completedAt: iso(6, 9), lines: [{ kind: "labor", description: "L", quantity: 1, unitPrice: 300 }] }),
      wo({ id: "old", status: "completed", completedAt: new Date(2026, 8, 1).toISOString(), lines: [{ kind: "labor", description: "L", quantity: 1, unitPrice: 50 }] }),
      wo({ id: "owed", status: "invoiced", completedAt: iso(7, 9), invoicedAt: iso(7, 10), lines: [{ kind: "labor", description: "L", quantity: 1, unitPrice: 200 }] }),
      wo({ id: "paid", status: "invoiced", completedAt: iso(2, 9), invoicedAt: iso(2, 10), paidAt: iso(3, 9), exportedAt: iso(3, 10), lines: [{ kind: "labor", description: "L", quantity: 1, unitPrice: 500 }] }),
      wo({ id: "open", status: "in-progress", lines: [{ kind: "labor", description: "L", quantity: 1, unitPrice: 999 }] }),
    ];
    expect(shopMoney(orders, now)).toEqual({ week: 1000, ready: 350, owed: 200, paidMonth: 500, sentMonth: 500 });
  });
});

describe("won jobs", () => {
  const project = (p: Partial<Project> & { id: string }): Project => ({ title: p.id, description: "", status: "in-progress", date: "Oct 1", bids: [], ...p });
  const jobs = [
    project({ id: "mine", chosenBidId: "b1", bids: [{ id: "b1", vendorProfileId: "v1", vendorName: "Me", vendorInitials: "M", rating: 5, reviewCount: 0, message: "", price: 900, submittedDate: "", expiryDate: "", thread: [] }] }),
    project({ id: "on-board", chosenBidId: "b2", bids: [{ id: "b2", vendorProfileId: "v1", vendorName: "Me", vendorInitials: "M", rating: 5, reviewCount: 0, message: "", price: 400, submittedDate: "", expiryDate: "", thread: [] }] }),
    project({ id: "theirs", chosenBidId: "b3", bids: [{ id: "b3", vendorProfileId: "v2", vendorName: "Them", vendorInitials: "T", rating: 5, reviewCount: 0, message: "", price: 100, submittedDate: "", expiryDate: "", thread: [] }] }),
    project({ id: "finished", status: "completed", chosenBidId: "b4", bids: [{ id: "b4", vendorProfileId: "v1", vendorName: "Me", vendorInitials: "M", rating: 5, reviewCount: 0, message: "", price: 250, submittedDate: "", expiryDate: "", thread: [] }] }),
  ];

  it("wonJobsNotOnBoard skips finished jobs and ones that already have a work order", () => {
    expect(wonJobsNotOnBoard(jobs, [{ projectId: "on-board" }], "v1").map((p) => p.id)).toEqual(["mine"]);
  });

  it("bookedJobs returns every job I won with the quoted price", () => {
    expect(bookedJobs(jobs, "v1").map((b) => [b.project.id, b.price])).toEqual([["mine", 900], ["on-board", 400], ["finished", 250]]);
  });
});
