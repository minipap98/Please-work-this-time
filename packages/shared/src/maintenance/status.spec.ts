import { describe, expect, it } from "vitest";
import type { LogEntry } from "../boatLog";
import { badgeText, computeStatus, dueCounts, dueSummary, dueTasks, formatInterval, latestLoggedHours, tasksFor } from "./status";
import type { MaintenanceTask } from "./catalog";

const today = new Date("2026-06-01");
const oil: MaintenanceTask = { id: "oil_filter", task: "Engine Oil & Filter", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100 };
const wax: MaintenanceTask = { id: "general_hull_wax", task: "Hull Wax", category: "Hull & Bottom", intervalMonths: 12 };
const entry = (p: Partial<LogEntry>): LogEntry => ({ id: "e", boatId: "b", title: "", category: null, date: "2026-01-01", engineHours: null, cost: null, laborHours: null, vendorName: null, notes: null, source: "owner", lines: [], ...p });

describe("computeStatus", () => {
  it("is never without a record, and never nags about it", () => {
    const s = computeStatus(oil, null, 300, null, today);
    expect(s.status).toBe("never");
    expect(badgeText(s)).toBe("Not logged yet");
  });

  it("goes by time: overdue past the interval, due soon within 60 days", () => {
    expect(computeStatus(wax, "2025-01-15", null, null, today).status).toBe("overdue");
    expect(computeStatus(wax, "2025-07-01", null, null, today).status).toBe("due-soon");
    expect(computeStatus(wax, "2026-03-01", null, null, today).status).toBe("ok");
    expect(badgeText(computeStatus(wax, "2025-07-01", null, null, today))).toBe("30d");
  });

  it("lets engine hours make a task more urgent, never less", () => {
    const s = computeStatus(oil, "2026-03-01", 420, 300, today);
    expect(s.status).toBe("overdue");
    expect(badgeText(s)).toBe("20 hrs over");
    expect(computeStatus(oil, "2025-01-01", 310, 300, today).status).toBe("overdue");
  });
});

describe("dueTasks", () => {
  it("counts Boat Log work as done and sorts the most urgent first", () => {
    const log = [entry({ title: "Annual service: oil change + filter", date: "2026-05-20", engineHours: 410 })];
    const out = dueTasks({ tasks: [wax, oil], manual: [{ taskId: "general_hull_wax", date: "2025-03-01" }], log, currentHours: 410, today });
    expect(out.map((t) => [t.id, t.status])).toEqual([
      ["general_hull_wax", "overdue"],
      ["oil_filter", "ok"],
    ]);
    expect(out[1].fromLog).toBe(true);
    expect(out[1].lastDate).toBe("2026-05-20");
    expect(dueSummary(dueCounts(out))).toBe("1 item needs attention · 2 total");
  });

  it("prefers the owner's own record on a tie and a newer date either way", () => {
    const log = [entry({ title: "oil change", date: "2026-05-20" })];
    const [t] = dueTasks({ tasks: [oil], manual: [{ taskId: "oil_filter", date: "2026-05-25" }], log, currentHours: null, today });
    expect(t.lastDate).toBe("2026-05-25");
    expect(t.fromLog).toBeUndefined();
  });
});

describe("task lists", () => {
  it("uses the saved plan's engine items plus the boat-wide ones, else the built-in list", () => {
    const plan = { engineLabel: "x", source: "claude" as const, records: [], tasks: [{ id: "a", task: "A", category: "Drivetrain" as const, intervalMonths: 6, intervalHours: null, notes: null }] };
    const withPlan = tasksFor(plan, { make: "Mercury", model: "Verado 250", type: "Outboard" });
    expect(withPlan[0]).toMatchObject({ id: "a", intervalHours: undefined });
    expect(withPlan.some((t) => t.id === "general_bilge_pump")).toBe(true);
    const builtIn = tasksFor(null, { make: "Mercury", model: "Verado 250", type: "Outboard" });
    expect(builtIn.some((t) => t.id === "supercharger_oil")).toBe(true);
  });

  it("formats intervals and finds the latest logged hours", () => {
    expect(formatInterval(12, 100)).toBe("Every 100 hrs or 1yr");
    expect(formatInterval(6)).toBe("Every 6mo");
    expect(formatInterval(36)).toBe("Every 3yr");
    expect(latestLoggedHours([entry({ date: "2025-01-01", engineHours: 100 }), entry({ date: "2026-01-01", engineHours: 250 }), entry({ date: "2026-02-01" })])).toBe(250);
  });
});
