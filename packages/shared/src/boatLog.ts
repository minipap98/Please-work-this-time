// Owner boat logbook: every job on the boat, owner-logged or vendor-verified.

import { lineAmount, toCsv, type LineKind } from "./shop.js";

export type LogSource = "owner" | "vendor" | "bosun-job";

export interface LogLine {
  kind: LineKind;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface LogEntry {
  id: string;
  boatId: string;
  title: string;
  category: string | null;
  date: string; // YYYY-MM-DD
  engineHours: number | null;
  cost: number | null;
  laborHours: number | null;
  vendorName: string | null;
  notes: string | null;
  source: LogSource;
  lines: LogLine[];
  /** Private file in boat-documents when the entry was imported from an invoice. Never shared. */
  invoicePath?: string | null;
}

export function isVerified(e: Pick<LogEntry, "source">): boolean {
  return e.source !== "owner";
}

export interface LogSummary {
  entries: number;
  verified: number;
  totalSpent: number;
  lastService: string | null;
  latestEngineHours: number | null;
  spentByYear: { year: string; total: number }[];
  topVendors: { name: string; jobs: number }[];
}

export function summarizeLog(entries: LogEntry[]): LogSummary {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const byYear = new Map<string, number>();
  const vendors = new Map<string, number>();
  let latestHours: number | null = null;
  for (const e of sorted) {
    const y = e.date.slice(0, 4);
    byYear.set(y, (byYear.get(y) ?? 0) + (Number(e.cost) || 0));
    if (e.vendorName) vendors.set(e.vendorName, (vendors.get(e.vendorName) ?? 0) + 1);
    if (latestHours === null && e.engineHours != null) latestHours = e.engineHours;
  }
  return {
    entries: entries.length,
    verified: entries.filter(isVerified).length,
    totalSpent: Math.round(entries.reduce((s, e) => s + (Number(e.cost) || 0), 0) * 100) / 100,
    lastService: sorted[0]?.date ?? null,
    latestEngineHours: latestHours,
    spentByYear: [...byYear.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, total]) => ({ year, total: Math.round(total * 100) / 100 })),
    topVendors: [...vendors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, jobs]) => ({ name, jobs })),
  };
}

export function logToCsv(entries: LogEntry[]): string {
  const rows: (string | number)[][] = [
    ["Date", "Service", "Category", "Performed by", "Verified", "Engine hours", "Labor hours", "Cost", "Line items", "Notes"],
  ];
  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    rows.push([
      e.date,
      e.title,
      e.category ?? "",
      e.vendorName ?? "Owner",
      isVerified(e) ? "Yes" : "No",
      e.engineHours ?? "",
      e.laborHours ?? "",
      e.cost != null ? Number(e.cost).toFixed(2) : "",
      e.lines.map((l) => `${l.quantity}× ${l.description} ($${lineAmount(l).toFixed(2)})`).join("; "),
      e.notes ?? "",
    ]);
  }
  return toCsv(rows);
}

// ── Shareable service history (for boat listings) ────────────────────────────

export interface HistoryEntry {
  date: string;
  title: string;
  category: string | null;
  shop: string | null;
  verified: boolean;
  engineHours: number | null;
  cost: number | null;
}

export interface SharedHistory {
  boat: { name: string; year: string; make: string; model: string; engine: string | null };
  showCosts: boolean;
  sharedAt: string;
  entries: HistoryEntry[];
}

export interface HistoryHighlights {
  jobs: number;
  verified: number;
  shops: number;
  firstYear: string | null;
  lastService: string | null;
  latestEngineHours: number | null;
  totalSpent: number | null; // only when costs are shown
}

export function historyHighlights(h: Pick<SharedHistory, "entries" | "showCosts">): HistoryHighlights {
  const sorted = [...h.entries].sort((a, b) => b.date.localeCompare(a.date));
  const shops = new Set(sorted.filter((e) => e.shop).map((e) => e.shop!.trim().toLowerCase()));
  return {
    jobs: sorted.length,
    verified: sorted.filter((e) => e.verified).length,
    shops: shops.size,
    firstYear: sorted.length ? sorted[sorted.length - 1].date.slice(0, 4) : null,
    lastService: sorted[0]?.date ?? null,
    latestEngineHours: sorted.find((e) => e.engineHours != null)?.engineHours ?? null,
    totalSpent: h.showCosts
      ? Math.round(sorted.reduce((s, e) => s + (Number(e.cost) || 0), 0) * 100) / 100
      : null,
  };
}

/** What the public page may show for a log entry: never notes, never cost unless allowed. */
export function toHistoryEntry(e: LogEntry, showCosts: boolean): HistoryEntry {
  return {
    date: e.date,
    title: e.title,
    category: e.category,
    shop: e.vendorName,
    verified: isVerified(e),
    engineHours: e.engineHours,
    cost: showCosts ? e.cost : null,
  };
}
