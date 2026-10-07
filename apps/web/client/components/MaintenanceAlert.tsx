import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getMaintenanceTasks, GENERAL_TASKS, DEFAULT_SERVICE_RECORDS, type MaintenanceTask } from "@/data/maintenanceData";
import { useServicePlan } from "@/hooks/use-service-plan";
import { useDemoMode } from "@/lib/demoMode";
import { useAuth } from "@/context/AuthContext";
import { useMyBoats } from "@/hooks/use-my-boat";
import { useBoatLog } from "@/hooks/use-boat-log";
import { mergeRecords, recordsFromLog } from "@shared/maintenanceMatch";


function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Inputs {
  /** A saved schedule replaces the built-in engine list. */
  planTasks?: MaintenanceTask[] | null;
  engineMake: string;
  engineModel: string;
  engineType: string;
  records: { taskId: string; date: string }[];
  disabled: string[];
  custom: { id: string }[];
}

function getStatusCounts({ planTasks, engineMake, engineModel, engineType, records, disabled, custom }: Inputs, today = new Date()) {
  const base = planTasks ? [...planTasks, ...GENERAL_TASKS] : getMaintenanceTasks(engineMake, engineModel, engineType);
  const tasks = [...base, ...(custom as MaintenanceTask[])]
    .filter((t) => !disabled.includes(t.id));

  let overdue = 0;
  let dueSoon = 0;

  for (const task of tasks) {
    const rec = records
      .filter((r) => r.taskId === task.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!rec) continue; // nothing logged yet isn't overdue

    const next = addMonths(new Date(rec.date), task.intervalMonths);
    const days = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (days < 0) overdue++;
    else if (days <= 60) dueSoon++;
  }

  return { overdue, dueSoon, total: tasks.length };
}

export default function MaintenanceAlert() {
  const navigate = useNavigate();
  const { demo } = useDemoMode();
  const { user } = useAuth();
  const { primary } = useMyBoats();
  const { data: logEntries = [] } = useBoatLog(demo ? undefined : primary?.id);
  const { data: plan } = useServicePlan(demo ? "demo" : primary?.id);
  const planTasks: MaintenanceTask[] | null = plan
    ? plan.tasks.map((t) => ({ ...t, intervalHours: t.intervalHours ?? undefined, notes: t.notes ?? undefined }))
    : null;

  const { overdue, dueSoon, total } = useMemo(() => {
    if (demo) {
      const b = readJson<{ engineMake?: string; engineModel?: string; engineType?: string } | null>("my_boat", null);
      return getStatusCounts({
        planTasks,
        engineMake: b?.engineMake ?? "Mercury",
        engineModel: b?.engineModel ?? "Verado 250 (2021–present)",
        engineType: b?.engineType ?? "Outboard",
        records: [...readJson("maintenance_records", DEFAULT_SERVICE_RECORDS), ...(plan?.records ?? [])],
        disabled: readJson("maintenance_disabled", []),
        custom: readJson("maintenance_custom", []),
      }, new Date("2026-03-08")); // the demo's sample history is dated around March 2026
    }
    // Same per-boat keys as the Maintenance page, plus work found in the Boat Log.
    const key = (name: string) => `${name}:${user?.id ?? "anon"}:${primary?.id ?? "none"}`;
    const engineMake = primary?.engine_make ?? "";
    const engineModel = primary?.engine_model ?? "";
    const engineType = primary?.engine_type ?? "";
    const custom = readJson<{ id: string }[]>(key("maintenance_custom"), []);
    const ids = [...(planTasks ? [...planTasks, ...GENERAL_TASKS] : getMaintenanceTasks(engineMake, engineModel, engineType)), ...custom].map((t) => t.id);
    const derived = recordsFromLog(
      ids,
      logEntries.map((e) => ({
        date: e.date,
        engineHours: e.engineHours,
        text: [e.title, e.notes, ...e.lines.map((l) => l.description)].filter(Boolean).join(" · "),
      }))
    );
    return getStatusCounts({
      planTasks,
      engineMake,
      engineModel,
      engineType,
      records: mergeRecords([...readJson<{ taskId: string; date: string }[]>(key("maintenance_records"), []), ...(plan?.records ?? [])], derived),
      disabled: readJson(key("maintenance_disabled"), []),
      custom,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, user?.id, primary, logEntries, plan]);


  const issueCount = overdue + dueSoon;

  return (
    <button
      onClick={() => navigate("/maintenance")}
      className="w-full h-full flex items-center gap-3 px-4 py-3.5 text-left rounded-xl border border-border bg-white shadow-card hover:border-sky-300 transition-colors"
    >
      {/* Wrench icon */}
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Maintenance</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {issueCount > 0
            ? `${issueCount} item${issueCount !== 1 ? "s" : ""} need attention · ${total} total`
            : `${total} items · all up to date`}
        </p>
      </div>

      {/* Badge (only if there are issues) */}
      {issueCount > 0 && (
        <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {issueCount}
        </span>
      )}

      {/* Chevron */}
      <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
