import { describe, expect, it } from "vitest";
import { HOURS_READING_TITLE, historyHighlights, isHoursReading, isPreviousOwnerEntry, logToCsv, spendByOwnership, summarizeLog, toHistoryEntry, type LogEntry } from "./boatLog";

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

describe("shared service history", () => {
  const entries = [
    entry({ id: "1", date: "2023-02-10", cost: 520, vendorName: "Harbor Marine", source: "vendor", engineHours: 102, notes: "private" }),
    entry({ id: "2", date: "2026-08-14", cost: 1186, vendorName: "harbor marine ", source: "vendor", engineHours: 304 }),
    entry({ id: "3", date: "2025-11-02", cost: 189 }),
  ];

  it("never carries notes and hides cost unless the owner allows it", () => {
    const hidden = toHistoryEntry(entries[0], false);
    expect(hidden).toEqual({ date: "2023-02-10", title: "Oil change", category: null, shop: "Harbor Marine", verified: true, engineHours: 102, cost: null });
    expect(JSON.stringify(hidden)).not.toContain("private");
    expect(toHistoryEntry(entries[0], true).cost).toBe(520);
  });

  it("summarizes the history for the listing header", () => {
    const shown = entries.map((e) => toHistoryEntry(e, false));
    expect(historyHighlights({ entries: shown, showCosts: false })).toEqual({
      jobs: 3, verified: 2, shops: 1, firstYear: "2023", lastService: "2026-08-14", latestEngineHours: 304, totalSpent: null,
    });
    const priced = entries.map((e) => toHistoryEntry(e, true));
    expect(historyHighlights({ entries: priced, showCosts: true }).totalSpent).toBe(1895);
  });
});

describe("spendByOwnership", () => {
  const entry = (id: string, date: string, cost: number | null): LogEntry => ({
    id, boatId: "b", title: id, category: null, date, engineHours: null, cost, laborHours: null, vendorName: null, notes: null, source: "owner", lines: [],
  });
  const log = [entry("old1", "2024-05-01", 800), entry("old2", "2025-02-10", null), entry("new1", "2026-03-03", 450.5), entry("new2", "2026-09-01", 120)];

  it("splits the log at the day the current owner took the boat on", () => {
    const s = spendByOwnership(log, "2026-01-15T14:00:00Z");
    expect(s.since).toBe("2026-01-15");
    expect(s.allTime).toEqual({ total: 1370.5, entries: 4, unpriced: 1 });
    expect(s.mine).toEqual({ total: 570.5, entries: 2, unpriced: 0 });
    expect(s.previous).toEqual({ total: 800, entries: 2, unpriced: 1 });
  });

  it("counts an entry on the handover day as the new owner's", () => {
    expect(isPreviousOwnerEntry({ date: "2026-01-15" }, "2026-01-15T23:00:00Z")).toBe(false);
    expect(isPreviousOwnerEntry({ date: "2026-01-14" }, "2026-01-15")).toBe(true);
  });

  it("has nothing in previous when the boat never changed hands", () => {
    const s = spendByOwnership(log, "2020-01-01");
    expect(s.previous.entries).toBe(0);
    expect(s.mine.total).toBe(s.allTime.total);
  });
});

describe("hours readings", () => {
  const entry = (id: string, date: string, cost: number | null, extra: Partial<LogEntry> = {}): LogEntry => ({
    id, boatId: "b", title: id, category: null, date, engineHours: null, cost, laborHours: null, vendorName: null, notes: null, source: "owner", lines: [], ...extra,
  });
  const reading = entry("r1", "2026-09-30", null, { title: HOURS_READING_TITLE, engineHours: 412 });
  const log = [entry("job", "2026-06-01", 300, { engineHours: 380 }), reading];

  it("count toward the hours but not the services or the spend", () => {
    expect(isHoursReading(reading)).toBe(true);
    const s = summarizeLog(log);
    expect(s.entries).toBe(1);
    expect(s.latestEngineHours).toBe(412);
    expect(s.lastService).toBe("2026-06-01");
    expect(s.totalSpent).toBe(300);
    expect(spendByOwnership(log, "2020-01-01").allTime.entries).toBe(1);
  });

  it("a shop entry with the same title is still work", () => {
    expect(isHoursReading({ title: HOURS_READING_TITLE, source: "vendor" })).toBe(false);
  });
});
