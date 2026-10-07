// What's due on a boat: the task list (saved plan or built-in engine list, plus boat-wide
// items), the latest record per task (marked done, or matched from the Boat Log), and each
// task's status. Same rules as the web's Maintenance page.

import type { LogEntry } from "../boatLog";
import { logEntryText } from "../boatLog/records";
import { mergeRecords, recordsFromLog } from "../maintenanceMatch";
import type { PlanRecord, ServicePlan } from "../servicePlan";
import { GENERAL_TASKS, getMaintenanceTasks, type MaintenanceCategory, type MaintenanceTask, type ServiceRecord } from "./catalog";

export type DueStatus = "overdue" | "due-soon" | "ok" | "never";

export interface TaskStatus extends MaintenanceTask {
  lastDate: string | null;
  lastServiceHours: number | null;
  nextDueDate: Date | null;
  nextDueHours: number | null;
  daysUntilDue: number | null;
  hoursUntilDue: number | null;
  status: DueStatus;
  /** The record came from the Boat Log rather than being marked done. */
  fromLog?: boolean;
}

export const STATUS_ORDER: Record<DueStatus, number> = { overdue: 0, "due-soon": 1, ok: 2, never: 3 };

export const DISPLAY_GROUPS: { name: string; categories: MaintenanceCategory[] }[] = [
  { name: "Engine & Propulsion", categories: ["Engine Oil & Fuel", "Cooling System", "Drivetrain"] },
  { name: "Electrical & Safety", categories: ["Electrical & Safety"] },
  { name: "Hull & Bottom", categories: ["Hull & Bottom"] },
];

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** "Every 100 hrs or 1yr" */
export function formatInterval(months: number, hours?: number | null): string {
  const timePart = months < 12 ? `${months}mo` : months === 12 ? "1yr" : `${months / 12}yr`;
  return hours ? `Every ${hours} hrs or ${timePart}` : `Every ${timePart}`;
}

/** A saved plan replaces the built-in engine list; boat-wide items are always included. */
export function tasksFor(plan: ServicePlan | null | undefined, engine: { make: string; model: string; type: string }): MaintenanceTask[] {
  if (plan) {
    return [...plan.tasks.map((t) => ({ ...t, intervalHours: t.intervalHours ?? undefined, notes: t.notes ?? undefined })), ...GENERAL_TASKS];
  }
  return getMaintenanceTasks(engine.make, engine.model, engine.type);
}

export function computeStatus(task: MaintenanceTask, lastDate: string | null, currentHours: number | null, lastServiceHours: number | null, today: Date = new Date()): TaskStatus {
  let timeStatus: DueStatus = "never";
  let daysUntilDue: number | null = null;
  let nextDueDate: Date | null = null;
  if (lastDate) {
    const next = addMonths(new Date(lastDate), task.intervalMonths);
    daysUntilDue = daysBetween(today, next);
    nextDueDate = next;
    timeStatus = daysUntilDue < 0 ? "overdue" : daysUntilDue <= 60 ? "due-soon" : "ok";
  }

  let hoursUntilDue: number | null = null;
  let nextDueHours: number | null = null;
  let hoursStatus: DueStatus | null = null;
  if (task.intervalHours && currentHours !== null && lastServiceHours !== null) {
    nextDueHours = lastServiceHours + task.intervalHours;
    hoursUntilDue = nextDueHours - currentHours;
    const buffer = Math.max(task.intervalHours * 0.2, 10);
    hoursStatus = hoursUntilDue < 0 ? "overdue" : hoursUntilDue <= buffer ? "due-soon" : "ok";
  }

  // The more urgent wins; "never" (nothing logged) is the least urgent: we don't know, so we don't nag.
  const status = hoursStatus !== null && STATUS_ORDER[hoursStatus] < STATUS_ORDER[timeStatus] ? hoursStatus : timeStatus;
  return { ...task, lastDate, lastServiceHours, nextDueDate, nextDueHours, daysUntilDue, hoursUntilDue, status };
}

export function badgeText(task: TaskStatus): string {
  if (task.status === "never") return "Not logged yet";
  if (task.status === "ok") return "OK";
  const hoursOverdue = task.intervalHours && task.hoursUntilDue !== null && task.hoursUntilDue < 0;
  const hoursDueSoon = task.intervalHours && task.hoursUntilDue !== null && task.hoursUntilDue >= 0;
  if (task.status === "overdue") {
    if (hoursOverdue) return `${Math.abs(Math.round(task.hoursUntilDue!))} hrs over`;
    if (task.daysUntilDue !== null) return `${Math.abs(task.daysUntilDue)}d overdue`;
    return "Overdue";
  }
  if (hoursDueSoon && task.hoursUntilDue !== null && task.daysUntilDue !== null) {
    return task.hoursUntilDue < task.daysUntilDue ? `${Math.round(task.hoursUntilDue)} hrs` : `${task.daysUntilDue}d`;
  }
  if (hoursDueSoon && task.hoursUntilDue !== null) return `${Math.round(task.hoursUntilDue)} hrs`;
  if (task.daysUntilDue !== null) return `${task.daysUntilDue}d`;
  return "Due soon";
}

export interface DueInput {
  tasks: MaintenanceTask[];
  /** Records the owner marked done (on the plan) and any kept on the device. */
  manual: (ServiceRecord | PlanRecord)[];
  /** The boat's log; work logged here counts as done. */
  log: LogEntry[];
  currentHours: number | null;
  today?: Date;
}

/** Every task with its status, most urgent first. */
export function dueTasks({ tasks, manual, log, currentHours, today = new Date() }: DueInput): TaskStatus[] {
  const derived = recordsFromLog(
    tasks.map((t) => t.id),
    log.map((e) => ({ date: e.date, engineHours: e.engineHours, text: logEntryText(e) })),
  );
  const fromLog = new Set(derived.map((r) => `${r.taskId}:${r.date}`));
  const records = mergeRecords(manual as ServiceRecord[], derived as ServiceRecord[]);
  return tasks
    .map((task) => {
      const rec = records.filter((r) => r.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      const s = computeStatus(task, rec?.date ?? null, currentHours, rec?.engineHours ?? null, today);
      return rec && fromLog.has(`${rec.taskId}:${rec.date}`) && !manual.some((m) => m.taskId === rec.taskId && m.date === rec.date) ? { ...s, fromLog: true } : s;
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999));
}

export interface DueCounts {
  overdue: number;
  dueSoon: number;
  ok: number;
  never: number;
  total: number;
}

export function dueCounts(tasks: TaskStatus[]): DueCounts {
  const c: DueCounts = { overdue: 0, dueSoon: 0, ok: 0, never: 0, total: tasks.length };
  for (const t of tasks) {
    if (t.status === "overdue") c.overdue++;
    else if (t.status === "due-soon") c.dueSoon++;
    else if (t.status === "ok") c.ok++;
    else c.never++;
  }
  return c;
}

/** The dashboard line: "3 items need attention · 21 total" or "21 items · all up to date". */
export function dueSummary(c: DueCounts): string {
  const attention = c.overdue + c.dueSoon;
  return attention > 0 ? `${attention} item${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} attention · ${c.total} total` : `${c.total} items · all up to date`;
}

/** Engine hours when nothing newer is known: the latest Boat Log entry that recorded them. */
export function latestLoggedHours(log: LogEntry[]): number | null {
  return [...log].sort((a, b) => b.date.localeCompare(a.date)).find((e) => e.engineHours != null)?.engineHours ?? null;
}
