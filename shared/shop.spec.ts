import { describe, expect, it } from "vitest";
import {
  advanceStatus,
  matchWorkOrderRef,
  openSlots,
  partsProgress,
  pullList,
  rfpFit,
  shopAlerts,
  shipmentBoatKey,
  carrierTrackingUrl,
  inboundTokenFromAddress,
  inventoryDelta,
  occupiesDay,
  parseShippingEmail,
  scheduleConflicts,
  toQuickBooksIif,
  toQuickBooksOnlineCsv,
  weekDays,
  workOrderTotals,
  type PartsShipment,
  type WorkOrder,
} from "./shop";

const now = new Date(2026, 9, 2); // Oct 2, 2026

function order(partial: Partial<WorkOrder>): WorkOrder {
  return {
    id: "wo1",
    number: "WO-1001",
    title: "100-hour service",
    description: "",
    status: "completed",
    customerName: "Dana Whitfield",
    customerEmail: "",
    boatLabel: "2021 Grady-White 336",
    assignedTo: "",
    bay: "",
    scheduledStart: null,
    scheduledEnd: null,
    engineHours: null,
    taxRate: 7,
    completedAt: "2026-09-30T15:00:00.000Z",
    exportedAt: null,
    createdAt: "2026-09-28T15:00:00.000Z",
    lines: [
      { kind: "labor", description: "Service labor", quantity: 2.5, unitPrice: 145 },
      { kind: "part", description: "Oil filter, 35-877769K01", quantity: 2, unitPrice: 18.5, inventoryItemId: "inv1" },
      { kind: "fee", description: "Shop supplies", quantity: 1, unitPrice: 12 },
    ],
    ...partial,
  };
}

describe("work order totals", () => {
  it("taxes parts only and sums labor hours", () => {
    const t = workOrderTotals(order({}).lines, 7);
    expect(t.labor).toBe(362.5);
    expect(t.parts).toBe(37);
    expect(t.fees).toBe(12);
    expect(t.tax).toBe(2.59);
    expect(t.total).toBe(414.09);
    expect(t.laborHours).toBe(2.5);
  });
});

describe("inventory delta", () => {
  it("returns stock to shelf when a part line shrinks or is removed", () => {
    const before = order({}).lines;
    const after = [{ ...before[1], quantity: 1 }];
    expect(inventoryDelta(before, after)).toEqual({ inv1: 1 });
    expect(inventoryDelta([], before)).toEqual({ inv1: -2 });
    expect(inventoryDelta(before, before)).toEqual({});
  });
});

describe("schedule", () => {
  it("builds a Monday-first week", () => {
    expect(weekDays(now)).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
  });

  it("spans multi-day jobs and flags bay conflicts", () => {
    const a = order({
      id: "a", status: "scheduled", bay: "Bay 1",
      scheduledStart: new Date(2026, 9, 1, 8).toISOString(),
      scheduledEnd: new Date(2026, 9, 2, 16).toISOString(),
    });
    const b = order({
      id: "b", status: "scheduled", bay: "Bay 1",
      scheduledStart: new Date(2026, 9, 2, 9).toISOString(),
      scheduledEnd: new Date(2026, 9, 2, 12).toISOString(),
    });
    const c = order({ id: "c", status: "scheduled", bay: "Bay 2", scheduledStart: b.scheduledStart, scheduledEnd: b.scheduledEnd });
    expect(occupiesDay(a, "2026-10-01")).toBe(true);
    expect(occupiesDay(a, "2026-10-02")).toBe(true);
    expect(occupiesDay(a, "2026-10-03")).toBe(false);
    expect(scheduleConflicts([a, b, c])).toEqual([["a", "b"]]);
  });
});

describe("shipping email parsing", () => {
  it("reads a UPS shipped notice from a supplier", () => {
    const parsed = parseShippingEmail(
      "Your West Marine order #WM-884213 has shipped",
      "Good news! Your order is on its way.\nUPS tracking number: 1Z999AA10123456784\nEstimated delivery: Tuesday, October 6",
      '"West Marine" <orders@westmarine.com>',
      now
    );
    expect(parsed.shipments).toEqual([{ carrier: "UPS", trackingNumber: "1Z999AA10123456784" }]);
    expect(parsed.status).toBe("shipped");
    expect(parsed.eta).toBe("2026-10-06");
    expect(parsed.orderNumber).toBe("WM-884213");
    expect(parsed.supplier).toBe("West Marine");
  });

  it("only accepts FedEx digit runs when FedEx is named", () => {
    const fedex = parseShippingEmail(
      "Out for delivery",
      "Your FedEx package is out for delivery today. Tracking number 7712 3456 7890",
      "TrackingUpdates@fedex.com",
      now
    );
    expect(fedex.shipments).toEqual([{ carrier: "FedEx", trackingNumber: "771234567890" }]);
    expect(fedex.status).toBe("out-for-delivery");

    const unknown = parseShippingEmail("Invoice", "Tracking 771234567890", "billing@example.com", now);
    expect(unknown.shipments).toEqual([]);
  });

  it("detects USPS numbers and delivered status", () => {
    const parsed = parseShippingEmail(
      "Delivered: your package",
      "Your item was delivered at 2:14 pm. USPS Tracking 9400 1000 0000 0000 0000 00",
      "auto-reply@usps.com",
      now
    );
    expect(parsed.shipments[0]).toEqual({ carrier: "USPS", trackingNumber: "9400100000000000000000" });
    expect(parsed.status).toBe("delivered");
  });

  it("never moves a shipment backwards", () => {
    expect(advanceStatus("out-for-delivery", "shipped")).toBe("out-for-delivery");
    expect(advanceStatus("shipped", "delivered")).toBe("delivered");
    expect(advanceStatus("delivered", "exception")).toBe("delivered");
    expect(advanceStatus("shipped", "exception")).toBe("exception");
  });

  it("builds carrier links and reads inbound tokens", () => {
    expect(carrierTrackingUrl("UPS", "1Z999AA10123456784")).toContain("ups.com");
    expect(carrierTrackingUrl("Other", "x")).toBeNull();
    expect(inboundTokenFromAddress("Parts <parts+ab12cd34ef@in.bosun.app>")).toBe("ab12cd34ef");
    expect(inboundTokenFromAddress("someone@else.com")).toBeNull();
  });
});

describe("QuickBooks export", () => {
  it("writes one QBO CSV row per line with taxable parts", () => {
    const csv = toQuickBooksOnlineCsv([order({})]);
    const rows = csv.trim().split("\r\n");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain("InvoiceNo,Customer,InvoiceDate");
    expect(rows[1]).toContain("WO-1001,Dana Whitfield");
    expect(rows[1]).toContain("Marine Labor");
    expect(rows[2]).toMatch(/Marine Parts,"Oil filter, 35-877769K01",2,18\.50,37\.00,Y,7%/);
  });

  it("writes a balanced IIF invoice", () => {
    const iif = toQuickBooksIif([order({})]);
    const lines = iif.trim().split("\r\n");
    const amounts = lines
      .filter((l) => l.startsWith("TRNS") || l.startsWith("SPL"))
      .map((l) => Number(l.split("\t")[5]));
    expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 6);
    expect(lines[lines.length - 1]).toBe("ENDTRNS");
  });
});

describe("parts paired with boats", () => {
  it("reads the shop's WO/PO reference off a supplier email and finds the work order", () => {
    const parsed = parseShippingEmail(
      "Defender order 4410923 has shipped",
      "PO #: WO-1042\nUPS 1Z999AA10123456784",
      "orders@defender.com",
      now
    );
    expect(parsed.workOrderRef).toBe("1042");
    const orders = [order({ id: "a", number: "WO-1041" }), order({ id: "b", number: "WO-1042", status: "waiting-parts" })];
    expect(matchWorkOrderRef(parsed.workOrderRef, orders)?.id).toBe("b");
    expect(matchWorkOrderRef(null, orders)).toBeNull();
    expect(parseShippingEmail("Shipped", "Work order 1043 parts", "", now).workOrderRef).toBe("1043");
  });

  it("tracks parts progress per work order and groups by boat", () => {
    const ships = [
      { workOrderId: "b", receivedAt: "2026-10-01T00:00:00Z", status: "delivered" as const, eta: null },
      { workOrderId: "b", receivedAt: null, status: "shipped" as const, eta: "2026-10-06" },
      { workOrderId: "b", receivedAt: null, status: "exception" as const, eta: "2026-10-04" },
      { workOrderId: null, receivedAt: null, status: "shipped" as const, eta: null },
    ];
    expect(partsProgress("b", ships)).toEqual({ total: 3, received: 1, open: 2, problems: 1, nextEta: "2026-10-04" });
    expect(partsProgress("zzz", ships).total).toBe(0);
    expect(shipmentBoatKey({ workOrderId: "b", boatLabel: "x", customerName: "" })).toBe("wo:b");
    expect(shipmentBoatKey({ workOrderId: null, boatLabel: " Reel Therapy ", customerName: "" })).toBe("boat:reel therapy");
    expect(shipmentBoatKey({ workOrderId: null, boatLabel: "", customerName: "" })).toBe("stock");
  });
});

describe("vendor Today", () => {
  const today = new Date(2026, 9, 2, 9); // Fri Oct 2
  const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();

  it("lists what needs the shop now, most urgent first", () => {
    const a = order({ id: "a", number: "WO-1", status: "scheduled", bay: "Bay 1", scheduledStart: at(2, 8), scheduledEnd: at(2, 12) });
    const b = order({ id: "b", number: "WO-2", status: "scheduled", bay: "Bay 1", scheduledStart: at(2, 10), scheduledEnd: at(2, 14) });
    const c = order({ id: "c", number: "WO-3", status: "waiting-parts", boatLabel: "Reel Therapy" });
    const done = order({ id: "d", number: "WO-4", status: "completed", exportedAt: null });
    const ship = (p: Partial<PartsShipment>): PartsShipment => ({
      id: "s", supplier: "Defender", description: "Impellers", carrier: "UPS", trackingNumber: "", status: "shipped",
      eta: null, workOrderId: null, boatLabel: "", customerName: "", inventoryItemId: null, quantity: 1,
      source: "manual", emailSubject: null, receivedAt: null, createdAt: at(1, 9), ...p,
    });
    const alerts = shopAlerts({
      orders: [a, b, c, done],
      shipments: [ship({ id: "s1", workOrderId: "c", receivedAt: at(1, 12), status: "delivered" }), ship({ id: "s2", status: "exception" })],
      inventory: [{ id: "i", sku: "", name: "Oil filter", category: "", binLocation: "A1", qtyOnHand: 2, reorderPoint: 4, unitCost: 1, unitPrice: 2, supplier: "", updatedAt: "" }],
      wonJobsNotOnBoard: 1,
      coiExpiry: "2026-10-20",
      today,
    });
    expect(alerts.map((x) => x.id)).toEqual(["conflict-a-b", "ship-s2", "ready-c", "unbilled", "low-stock", "coi", "won-jobs"]);
    expect(alerts.find((x) => x.id === "coi")?.text).toBe("Your insurance certificate expires in 18 days");
    expect(alerts.find((x) => x.id === "ready-c")?.action).toEqual({ label: "Start job", tab: "orders", workOrderId: "c" });
  });

  it("frames new jobs by open slots and past experience", () => {
    const busy = order({ id: "x", status: "scheduled", bay: "Bay 1", scheduledStart: at(3, 8), scheduledEnd: at(5, 16) });
    const slots = openSlots([busy], ["Bay 1", "Haul-out"], today, 5);
    expect(slots[0]).toEqual({ day: "2026-10-03", bay: "Haul-out" });
    expect(slots.some((s) => s.day === "2026-10-04")).toBe(false); // Sunday skipped
    expect(slots.find((s) => s.bay === "Bay 1")?.day).toBe("2026-10-06");

    const past = [order({ id: "p1", title: "Bottom paint, 2 coats ablative" }), order({ id: "p2", title: "Bottom paint + zincs", status: "invoiced" })];
    const fit = rfpFit({ title: "Bottom paint before season", haulOutRequired: true }, past, slots, today);
    expect(fit.pastJobs).toBe(2);
    expect(fit.slot?.bay).toBe("Haul-out");
    expect(rfpFit({ title: "Stereo install" }, past, slots, today).pastJobs).toBe(0);
    // Generic words like "replacement" don't count as experience.
    const trim = [order({ id: "t", title: "Trim tab actuator replacement" })];
    expect(rfpFit({ title: "T-Top Canvas & Side Curtain Replacement", category: "Canvas & Upholstery" }, trim, slots, today).pastJobs).toBe(0);
  });

  it("builds a tech's pull list with bin locations", () => {
    const inv = [{ id: "inv1", sku: "", name: "Oil filter (Verado)", category: "", binLocation: "A1", qtyOnHand: 9, reorderPoint: 2, unitCost: 1, unitPrice: 2, supplier: "", updatedAt: "" }];
    const list = pullList(order({ lines: [
      { kind: "labor", description: "Labor", quantity: 2, unitPrice: 100 },
      { kind: "part", description: "Lenco actuator", quantity: 1, unitPrice: 189 },
      { kind: "part", description: "Oil filter", quantity: 2, unitPrice: 18.5, inventoryItemId: "inv1" },
    ] }), inv);
    expect(list).toEqual([
      { description: "Oil filter (Verado)", quantity: 2, bin: "A1", inStock: 9 },
      { description: "Lenco actuator", quantity: 1, bin: "Special order", inStock: null },
    ]);
  });
});
