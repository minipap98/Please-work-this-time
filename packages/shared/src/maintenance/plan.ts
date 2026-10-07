// A boat's saved service schedule (boat_service_plans): reading, saving, asking the server for
// the manufacturer intervals, and marking tasks done.

import type { ApiClient } from "../api/client";
import type { Db } from "../db/client";
import type { Json } from "../database.types";
import { engineLabel, normalizePlan, type EngineRequest, type PlanRecord, type PlanTask, type ServicePlan } from "../servicePlan";
import type { MaintenanceTask } from "./catalog";

const MISSING_TABLE = /boat_service_plans|relation .* does not exist|schema cache/i;

/** The saved schedule, or null when there isn't one (or the migration hasn't run). */
export async function getServicePlan(client: Db, boatId: string): Promise<ServicePlan | null> {
  const { data, error } = await client.from("boat_service_plans").select("*").eq("boat_id", boatId).maybeSingle();
  if (error) {
    if (MISSING_TABLE.test(error.message)) return null;
    throw error;
  }
  if (!data) return null;
  return {
    engineLabel: data.engine_label,
    tasks: normalizePlan({ tasks: data.tasks }),
    records: (Array.isArray(data.records) ? data.records : []) as unknown as PlanRecord[],
    source: data.source === "manual" ? "manual" : "claude",
  };
}

export async function saveServicePlan(client: Db, ownerId: string, boatId: string, plan: ServicePlan): Promise<void> {
  const { error } = await client.from("boat_service_plans").upsert({
    boat_id: boatId,
    owner_id: ownerId,
    engine_label: plan.engineLabel,
    tasks: plan.tasks as unknown as Json,
    records: plan.records as unknown as Json,
    source: plan.source,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (MISSING_TABLE.test(error.message)) throw new Error("Saving schedules needs a quick database update (20261014_service_plans.sql).");
    throw error;
  }
}

/** Ask the server (Claude) for the engines' manufacturer schedule. Nothing is saved until the owner confirms. */
export async function requestIntervals(api: ApiClient, engine: EngineRequest): Promise<PlanTask[]> {
  const res = await api.post<{ tasks?: unknown }>("/api/maintenance/intervals", engine);
  if (res.ok && res.body.tasks) return normalizePlan({ tasks: res.body.tasks });
  throw new Error(res.body.code === "not_configured" ? "Service interval lookup isn't switched on yet." : res.body.error ?? `Schedule lookup failed (server error ${res.status}).`);
}

export function engineRequestFor(boat: {
  engine_make: string | null;
  engine_model: string | null;
  engine_type: string | null;
  engine_count: number | null;
  year: string | null;
  make: string | null;
  model: string | null;
}): EngineRequest {
  return {
    engineMake: boat.engine_make ?? "",
    engineModel: boat.engine_model ?? "",
    engineType: boat.engine_type || null,
    engineCount: boat.engine_count ?? 1,
    boatYear: boat.year ?? null,
    boatMake: boat.make ?? null,
    boatModel: boat.model ?? null,
  };
}

/** A plan task from a built-in one, so a built-in list can be saved as a manual plan. */
export function planTaskFrom(t: MaintenanceTask): PlanTask {
  return { id: t.id, task: t.task, category: t.category, intervalMonths: t.intervalMonths, intervalHours: t.intervalHours ?? null, notes: t.notes ?? null };
}

/**
 * The plan after marking a task done: the record replaces any earlier one for that task.
 * Without a plan yet, the current (built-in) engine tasks become a manual plan so the date
 * is kept on the account rather than on one device.
 */
export function planWithRecord(plan: ServicePlan | null, fallback: { engine: EngineRequest; engineTasks: MaintenanceTask[] }, record: PlanRecord): ServicePlan {
  const base: ServicePlan = plan ?? { engineLabel: engineLabel(fallback.engine), tasks: fallback.engineTasks.map(planTaskFrom), records: [], source: "manual" };
  return { ...base, records: [...base.records.filter((r) => r.taskId !== record.taskId), record] };
}

/** Shortest hour interval first; time-only items after, by months. */
export function byInterval(a: PlanTask, b: PlanTask): number {
  const ah = a.intervalHours ?? Infinity;
  const bh = b.intervalHours ?? Infinity;
  return ah - bh || a.intervalMonths - b.intervalMonths || a.task.localeCompare(b.task);
}

/** One editable row of the schedule review. */
export interface PlanRow {
  task: PlanTask;
  track: boolean;
  done: boolean;
  date: string;
  hours: string;
}

export function planRows(tasks: PlanTask[], knownDone: PlanRecord[]): PlanRow[] {
  return [...tasks].sort(byInterval).map((t) => {
    const rec = knownDone.filter((r) => r.taskId === t.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return { task: t, track: true, done: !!rec, date: rec?.date ?? "", hours: rec?.engineHours != null ? String(rec.engineHours) : "" };
  });
}

/** The plan the rows describe, or the reason it can't be saved yet. */
export function planFromRows(engine: EngineRequest, rows: PlanRow[]): { plan: ServicePlan | null; problem: string | null } {
  const tracked = rows.filter((r) => r.track);
  if (tracked.length === 0) return { plan: null, problem: "Pick at least one item to track." };
  if (tracked.some((r) => r.done && !r.date)) return { plan: null, problem: "Add a date for each item marked already done." };
  return {
    plan: {
      engineLabel: engineLabel(engine),
      source: "claude",
      tasks: tracked.map((r) => r.task),
      records: tracked.filter((r) => r.done && r.date).map((r) => ({ taskId: r.task.id, date: r.date, ...(r.hours ? { engineHours: Number(r.hours) } : {}) })),
    },
    problem: null,
  };
}
