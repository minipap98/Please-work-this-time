import { describe, expect, it } from "vitest";
import { engineRequestFor, planFromRows, planRows, planWithRecord } from "./plan";
import { GENERAL_TASKS } from "./catalog";

const engine = engineRequestFor({ engine_make: "Mercury", engine_model: "Verado 250", engine_type: "Outboard", engine_count: 2, year: "2020", make: "Sea Ray", model: "SDX 250" });
const tasks = [
  { id: "impeller", task: "Impeller", category: "Cooling System" as const, intervalMonths: 36, intervalHours: 300, notes: null },
  { id: "oil_filter", task: "Oil", category: "Engine Oil & Fuel" as const, intervalMonths: 12, intervalHours: 100, notes: null },
  { id: "zincs", task: "Zincs", category: "Drivetrain" as const, intervalMonths: 12, intervalHours: null, notes: null },
];

describe("schedule review", () => {
  it("orders rows by hour interval and pre-fills what's known done", () => {
    const rows = planRows(tasks, [{ taskId: "oil_filter", date: "2026-01-05", engineHours: 300 }]);
    expect(rows.map((r) => r.task.id)).toEqual(["oil_filter", "impeller", "zincs"]);
    expect(rows[0]).toMatchObject({ done: true, date: "2026-01-05", hours: "300" });
  });

  it("refuses an empty plan or a done item without a date, else builds the plan", () => {
    const rows = planRows(tasks, []);
    expect(planFromRows(engine, rows.map((r) => ({ ...r, track: false }))).problem).toMatch(/at least one/);
    expect(planFromRows(engine, [{ ...rows[0], done: true, date: "" }]).problem).toMatch(/date/);
    const { plan } = planFromRows(engine, [{ ...rows[0], done: true, date: "2026-02-01", hours: "320" }, { ...rows[1], track: false }, rows[2]]);
    expect(plan?.engineLabel).toBe("Twin Mercury Verado 250");
    expect(plan?.tasks.map((t) => t.id)).toEqual(["oil_filter", "zincs"]);
    expect(plan?.records).toEqual([{ taskId: "oil_filter", date: "2026-02-01", engineHours: 320 }]);
  });
});

describe("marking done", () => {
  it("replaces the task's earlier record on an existing plan", () => {
    const plan = { engineLabel: "x", source: "claude" as const, tasks, records: [{ taskId: "oil_filter", date: "2025-01-01" }, { taskId: "zincs", date: "2025-06-01" }] };
    const next = planWithRecord(plan, { engine, engineTasks: [] }, { taskId: "oil_filter", date: "2026-03-01", engineHours: 400 });
    expect(next.records).toEqual([{ taskId: "zincs", date: "2025-06-01" }, { taskId: "oil_filter", date: "2026-03-01", engineHours: 400 }]);
    expect(next.source).toBe("claude");
  });

  it("starts a manual plan from the built-in engine list when there is none", () => {
    const next = planWithRecord(null, { engine, engineTasks: GENERAL_TASKS.slice(0, 2) }, { taskId: "general_bottom_paint", date: "2026-03-01" });
    expect(next.source).toBe("manual");
    expect(next.engineLabel).toBe("Twin Mercury Verado 250");
    expect(next.tasks.map((t) => t.id)).toEqual(["general_bottom_paint", "general_hull_wax"]);
    expect(next.records).toEqual([{ taskId: "general_bottom_paint", date: "2026-03-01" }]);
  });
});
