import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getMaintenanceTasks, DEFAULT_SERVICE_RECORDS } from "@/data/maintenanceData";

const TODAY = new Date("2026-03-08");

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getStatusCounts() {
  // Load boat info
  let engineMake = "Mercury";
  let engineModel = "Verado 250 (2021–present)";
  let engineType = "Outboard";
  try {
    const b = JSON.parse(localStorage.getItem("my_boat") ?? "null");
    if (b) { engineMake = b.engineMake; engineModel = b.engineModel; engineType = b.engineType; }
  } catch {}

  // Load service records
  let records: { taskId: string; date: string }[] = DEFAULT_SERVICE_RECORDS;
  try {
    const stored = localStorage.getItem("maintenance_records");
    if (stored) records = JSON.parse(stored);
  } catch {}

  // Load disabled task IDs
  let disabled: string[] = [];
  try {
    const stored = localStorage.getItem("maintenance_disabled");
    if (stored) disabled = JSON.parse(stored);
  } catch {}

  const tasks = getMaintenanceTasks(engineMake, engineModel, engineType)
    .filter((t) => !disabled.includes(t.id));

  // Load custom tasks
  try {
    const stored = localStorage.getItem("maintenance_custom");
    if (stored) {
      const custom = JSON.parse(stored);
      tasks.push(...custom.filter((t: { id: string }) => !disabled.includes(t.id)));
    }
  } catch {}

  let overdue = 0;
  let dueSoon = 0;

  for (const task of tasks) {
    const rec = records
      .filter((r) => r.taskId === task.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!rec) { overdue++; continue; }

    const next = addMonths(new Date(rec.date), task.intervalMonths);
    const days = Math.round((next.getTime() - TODAY.getTime()) / 86400000);
    if (days < 0) overdue++;
    else if (days <= 60) dueSoon++;
  }

  return { overdue, dueSoon, total: tasks.length };
}

export default function MaintenanceAlert() {
  const navigate = useNavigate();
  const { overdue, dueSoon, total } = useMemo(getStatusCounts, []);

  const issueCount = overdue + dueSoon;

  return (
    <button
      onClick={() => navigate("/maintenance")}
      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white border-y border-border hover:bg-gray-50 transition-colors"
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
