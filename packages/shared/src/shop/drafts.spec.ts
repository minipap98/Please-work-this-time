import { describe, expect, it } from "vitest";
import type { WorkOrder } from "../shop";
import { DEFAULT_SHOP_SETTINGS } from "./settings";
import { appendTechNote, blankWorkOrder, draftFromOrder, invoiceText, nextWorkOrderNumber } from "./drafts";

const order: WorkOrder = {
  id: "wo1",
  number: "WO-1042",
  title: "Impeller and lower unit oil",
  description: "Customer reports overheating at idle.",
  status: "completed",
  customerName: "Ann Rivers",
  customerEmail: "ann@example.com",
  boatLabel: "2019 Grady-White 236 · Reel Time",
  assignedTo: "Marco",
  bay: "Bay 1",
  scheduledStart: "2026-10-01T12:00:00.000Z",
  scheduledEnd: "2026-10-01T16:00:00.000Z",
  engineHours: 410,
  taxRate: 7,
  completedAt: "2026-10-01T18:00:00.000Z",
  exportedAt: null,
  createdAt: "2026-09-30T12:00:00.000Z",
  lines: [
    { kind: "labor", description: "Labor", quantity: 2, unitPrice: 145 },
    { kind: "part", description: "Impeller kit", quantity: 1, unitPrice: 80 },
  ],
};

describe("nextWorkOrderNumber", () => {
  it("starts at WO-1001 and counts past the highest number", () => {
    expect(nextWorkOrderNumber([])).toBe("WO-1001");
    expect(nextWorkOrderNumber([{ number: "WO-1042" }, { number: "WO-1007" }, { number: "custom" }])).toBe("WO-1043");
  });
});

describe("blankWorkOrder", () => {
  it("books tomorrow 8–12 in the first bay with the first tech and one labor line", () => {
    const d = blankWorkOrder("WO-1001", DEFAULT_SHOP_SETTINGS, new Date(2026, 9, 8, 15, 30));
    expect(d.bay).toBe("Bay 1");
    expect(d.assignedTo).toBe("Marco");
    expect(new Date(d.scheduledStart!).getDate()).toBe(9);
    expect(new Date(d.scheduledStart!).getHours()).toBe(8);
    expect(new Date(d.scheduledEnd!).getHours()).toBe(12);
    expect(d.lines).toEqual([{ kind: "labor", description: "Labor", quantity: 1, unitPrice: 145 }]);
    expect(d.taxRate).toBe(7);
  });

  it("draftFromOrder drops the server-owned stamps", () => {
    const d = draftFromOrder(order);
    expect(d.id).toBe("wo1");
    expect("createdAt" in d).toBe(false);
    expect("completedAt" in d).toBe(false);
  });
});

describe("invoiceText", () => {
  it("lists the lines, totals, notes and the shop's name", () => {
    const { subject, body } = invoiceText(order, "Dean's Marine");
    expect(subject).toBe("Invoice WO-1042 from Dean's Marine");
    expect(body).toContain("Hi Ann,");
    expect(body).toContain("Impeller and lower unit oil on 2019 Grady-White 236 · Reel Time");
    expect(body).toContain("Labor — 2 × $145.00 = $290.00");
    expect(body).toContain("Subtotal $370.00");
    expect(body).toContain("Tax $5.60");
    expect(body).toContain("Total due $375.60");
    expect(body).toContain("Notes: Customer reports overheating at idle.");
    expect(body.endsWith("Dean's Marine")).toBe(true);
  });
});

describe("appendTechNote", () => {
  it("stamps the note with the day and the tech, and leaves blanks alone", () => {
    const out = appendTechNote("Existing.", "Marco", "  Found a cracked hose ", new Date(2026, 9, 8));
    expect(out).toBe("Existing.\nOct 8 (Marco): Found a cracked hose");
    expect(appendTechNote("Existing.", "Marco", "   ")).toBe("Existing.");
    expect(appendTechNote("", "Jess", "Started", new Date(2026, 0, 2))).toBe("Jan 2 (Jess): Started");
  });
});
