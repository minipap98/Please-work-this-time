import { describe, expect, it } from "vitest";
import { shopAlerts, type WorkOrder } from "../shop";
import { blankEstimate, draftFromOrder } from "./drafts";
import { DEFAULT_SHOP_SETTINGS } from "./settings";
import { estimateExpiry, estimateStep, estimateText, estimateUrl, publicEstimateState } from "./estimate";
import { todayBoard } from "./today";

const now = new Date(2026, 9, 20, 10, 0); // Oct 20, 2026
const iso = (d: number, h = 9) => new Date(2026, 9, d, h).toISOString();

function wo(p: Partial<WorkOrder> & { id: string }): WorkOrder {
  return {
    number: `WO-${p.id}`,
    title: "Repower, twin F300",
    description: "",
    status: "estimate",
    customerName: "John Pappas",
    customerEmail: "john@example.com",
    boatLabel: "2019 Pursuit S 288",
    assignedTo: "",
    bay: "",
    scheduledStart: null,
    scheduledEnd: null,
    engineHours: null,
    taxRate: 7,
    completedAt: null,
    exportedAt: null,
    createdAt: iso(1),
    lines: [
      { kind: "labor", description: "Labor", quantity: 10, unitPrice: 145 },
      { kind: "part", description: "Parts", quantity: 1, unitPrice: 1000 },
    ],
    ...p,
  };
}

describe("estimateStep", () => {
  it("walks draft → sent → approved, with declined and expired on the side", () => {
    expect(estimateStep(wo({ id: "a" }), now)).toBe("draft");
    expect(estimateStep(wo({ id: "a", estimateSentAt: iso(18) }), now)).toBe("sent");
    expect(estimateStep(wo({ id: "a", estimateSentAt: iso(18), estimateDeclinedAt: iso(19) }), now)).toBe("declined");
    expect(estimateStep(wo({ id: "a", estimateSentAt: new Date(2026, 8, 1).toISOString() }), now)).toBe("expired");
    // Approval moves the order to scheduled and the stamp stays with it.
    expect(estimateStep(wo({ id: "a", status: "scheduled", estimateSentAt: iso(18), estimateApprovedAt: iso(19) }), now)).toBe("approved");
  });

  it("is null for a job that was never quoted", () => {
    expect(estimateStep(wo({ id: "a", status: "scheduled" }), now)).toBeNull();
    expect(estimateStep(wo({ id: "a", status: "completed", estimateSentAt: null }), now)).toBeNull();
  });

  it("treats an approved job moved back to Estimate as a re-quote", () => {
    expect(estimateStep(wo({ id: "a", estimateSentAt: iso(18), estimateApprovedAt: iso(19) }), now)).toBe("sent");
  });

  it("links answer for 30 days", () => {
    expect(estimateExpiry("2026-10-01T12:00:00.000Z")).toBe("2026-10-31T12:00:00.000Z");
  });
});

describe("publicEstimateState", () => {
  const sent = { approvedAt: null, declinedAt: null, expiresAt: iso(30) };
  it("stays open until answered or expired, and a decline can still turn into a yes", () => {
    expect(publicEstimateState(sent, now)).toBe("open");
    expect(publicEstimateState({ ...sent, declinedAt: iso(19) }, now)).toBe("declined");
    expect(publicEstimateState({ ...sent, approvedAt: iso(19) }, now)).toBe("approved");
    expect(publicEstimateState({ ...sent, expiresAt: iso(19) }, now)).toBe("expired");
    expect(publicEstimateState({ ...sent, approvedAt: iso(19), expiresAt: iso(1) }, now)).toBe("approved");
  });
});

describe("estimateText and estimateUrl", () => {
  it("builds the link and an email with the lines, the total and where to approve", () => {
    const link = estimateUrl("https://getbosun.app/", "abc123");
    expect(link).toBe("https://getbosun.app/estimate/abc123");
    const { subject, body } = estimateText(wo({ id: "1044", description: "Includes rigging." }), "Dean's Marine", link);
    expect(subject).toBe("Estimate WO-1044 from Dean's Marine");
    expect(body).toContain("Hi John,");
    expect(body).toContain("Repower, twin F300 on 2019 Pursuit S 288");
    expect(body).toContain("Labor — 10 × $145.00 = $1,450.00");
    expect(body).toContain("Estimated total $2,520.00");
    expect(body).toContain("Notes: Includes rigging.");
    expect(body).toContain("good for 30 days");
    expect(body).toContain(link);
  });
});

describe("blankEstimate and draftFromOrder", () => {
  it("starts an estimate with no date, bay or tech", () => {
    const d = blankEstimate("WO-1050", DEFAULT_SHOP_SETTINGS, now);
    expect(d.status).toBe("estimate");
    expect(d.scheduledStart).toBeNull();
    expect(d.bay).toBe("");
    expect(d.assignedTo).toBe("");
    expect(d.lines).toHaveLength(1);
  });

  it("keeps the estimate trail out of the editor's draft", () => {
    const d = draftFromOrder(wo({ id: "a", estimateToken: "tok", estimateSentAt: iso(18), estimateNote: "ok" }));
    expect("estimateToken" in d).toBe(false);
    expect("estimateSentAt" in d).toBe(false);
    expect("estimateNote" in d).toBe(false);
  });
});

describe("estimates on the Today screen", () => {
  it("keeps unapproved estimates off the board even when they carry a date", () => {
    const [today] = todayBoard([wo({ id: "q", scheduledStart: iso(20, 8), scheduledEnd: iso(20, 12) })], now);
    expect(today.list).toEqual([]);
  });

  it("flags approved-but-unbooked jobs, declines, and how many estimates are out", () => {
    const alerts = shopAlerts({
      orders: [
        wo({ id: "yes", status: "scheduled", estimateSentAt: iso(18), estimateApprovedAt: iso(19) }),
        wo({ id: "no", estimateSentAt: iso(18), estimateDeclinedAt: iso(19), estimateNote: "Too much for this year" }),
        wo({ id: "out1", estimateSentAt: iso(18) }),
        wo({ id: "out2", estimateSentAt: iso(17) }),
        wo({ id: "draft" }),
      ],
      shipments: [],
      inventory: [],
      today: now,
    });
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain("approved-yes");
    expect(ids).toContain("declined-no");
    expect(ids).toContain("estimates-out");
    expect(alerts.find((a) => a.id === "approved-yes")?.action).toEqual({ label: "Schedule", tab: "orders", workOrderId: "yes" });
    expect(alerts.find((a) => a.id === "declined-no")?.text).toContain('"Too much for this year"');
    expect(alerts.find((a) => a.id === "estimates-out")?.text).toBe("2 estimates ($5,040) waiting on customers");
  });
});
