import { describe, expect, it } from "vitest";
import { logToCsv, summarizeLog, type LogEntry } from "./boatLog";

const entry = (p: Partial<LogEntry>): LogEntry => ({
  id: "e",
  boatId: "b",
  title: "Oil change",
  category: null,
  date: "2026-05-01",
  engineHours: null,
  cost: null,
  laborHours: null,
  vendorName: null,
  notes: null,
  source: "owner",
  lines: [],
  ...p,
});

describe("boat log summary", () => {
  it("totals spend, counts verified jobs and takes hours from the newest entry", () => {
    const s = summarizeLog([
      entry({ id: "1", date: "2025-03-01", cost: 400, engineHours: 210, vendorName: "Harbor Marine", source: "vendor" }),
      entry({ id: "2", date: "2026-06-10", cost: 1250.5, engineHours: 302, vendorName: "Harbor Marine", source: "bosun-job" }),
      entry({ id: "3", date: "2026-07-04", cost: 60 }),
    ]);
    expect(s.entries).toBe(3);
    expect(s.verified).toBe(2);
    expect(s.totalSpent).toBe(1710.5);
    expect(s.lastService).toBe("2026-07-04");
    expect(s.latestEngineHours).toBe(302);
    expect(s.spentByYear).toEqual([{ year: "2026", total: 1310.5 }, { year: "2025", total: 400 }]);
    expect(s.topVendors).toEqual([{ name: "Harbor Marine", jobs: 2 }]);
  });

  it("exports itemized CSV", () => {
    const csv = logToCsv([
      entry({
        source: "vendor",
        vendorName: "Harbor Marine",
        cost: 37,
        lines: [{ kind: "part", description: "Oil filter", quantity: 2, unitPrice: 18.5 }],
      }),
    ]);
    expect(csv).toContain("2026-05-01,Oil change,,Harbor Marine,Yes,,,37.00,2× Oil filter ($37.00),");
  });
});
