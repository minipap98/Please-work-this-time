import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getMaintenanceTasks,
  CATEGORY_ICONS,
  DEFAULT_SERVICE_RECORDS,
  type MaintenanceCategory,
  type MaintenanceTask,
  type ServiceRecord,
} from "@/data/maintenanceData";

// ─── Types ───────────────────────────────────────────────────
type StatusFilter = "all" | "overdue" | "due-soon" | "ok";

interface TaskStatus extends MaintenanceTask {
  lastDate: string | null;
  nextDueDate: Date | null;
  daysUntilDue: number | null; // negative = overdue
  status: "overdue" | "due-soon" | "ok" | "never";
  isCustom?: boolean;
}

interface CustomTask {
  id: string;
  task: string;
  category: MaintenanceCategory;
  intervalMonths: number;
  notes?: string;
  isCustom: true;
}

// ─── Helpers ─────────────────────────────────────────────────
const TODAY = new Date("2026-03-08");

const ALL_CATEGORIES: MaintenanceCategory[] = [
  "Engine Oil & Fuel",
  "Cooling System",
  "Drivetrain",
  "Electrical & Safety",
  "Hull & Bottom",
];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeStatus(task: MaintenanceTask, lastDate: string | null): TaskStatus {
  if (!lastDate) {
    return { ...task, lastDate: null, nextDueDate: null, daysUntilDue: null, status: "never" };
  }
  const last = new Date(lastDate);
  const next = addMonths(last, task.intervalMonths);
  const days = daysBetween(TODAY, next);
  const status: TaskStatus["status"] =
    days < 0 ? "overdue" : days <= 60 ? "due-soon" : "ok";
  return { ...task, lastDate, nextDueDate: next, daysUntilDue: days, status };
}

const STATUS_ORDER: Record<TaskStatus["status"], number> = {
  overdue: 0,
  never: 1,
  "due-soon": 2,
  ok: 3,
};

const STATUS_STYLES: Record<TaskStatus["status"], { bar: string; badge: string; label: string }> = {
  overdue:   { bar: "bg-red-500",   badge: "bg-red-50 text-red-600 border border-red-200",   label: "Overdue" },
  never:     { bar: "bg-red-400",   badge: "bg-red-50 text-red-500 border border-red-200",   label: "Never serviced" },
  "due-soon":{ bar: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "Due soon" },
  ok:        { bar: "bg-green-500", badge: "bg-green-50 text-green-700 border border-green-200", label: "Up to date" },
};

// ─── Component ───────────────────────────────────────────────
export default function MaintenancePage() {
  const navigate = useNavigate();

  // Load boat info
  const boatInfo = useMemo(() => {
    try {
      const stored = localStorage.getItem("my_boat");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const engineMake  = boatInfo?.engineMake  ?? "Mercury";
  const engineModel = boatInfo?.engineModel ?? "Verado 250 (2021–present)";
  const engineType  = boatInfo?.engineType  ?? "Outboard";
  const boatName    = boatInfo?.name ?? [boatInfo?.year, boatInfo?.make, boatInfo?.model].filter(Boolean).join(" ") ?? "My Boat";

  // Load / initialize service records
  const [records, setRecords] = useState<ServiceRecord[]>(() => {
    try {
      const stored = localStorage.getItem("maintenance_records");
      return stored ? JSON.parse(stored) : DEFAULT_SERVICE_RECORDS;
    } catch {
      return DEFAULT_SERVICE_RECORDS;
    }
  });

  function saveRecords(next: ServiceRecord[]) {
    setRecords(next);
    localStorage.setItem("maintenance_records", JSON.stringify(next));
  }

  // Disabled task IDs
  const [disabled, setDisabled] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("maintenance_disabled");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  function saveDisabled(next: string[]) {
    setDisabled(next);
    localStorage.setItem("maintenance_disabled", JSON.stringify(next));
  }

  function toggleDisabled(id: string) {
    const next = disabled.includes(id)
      ? disabled.filter((d) => d !== id)
      : [...disabled, id];
    saveDisabled(next);
  }

  // Custom tasks
  const [customTasks, setCustomTasks] = useState<CustomTask[]>(() => {
    try {
      const stored = localStorage.getItem("maintenance_custom");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  function saveCustomTasks(next: CustomTask[]) {
    setCustomTasks(next);
    localStorage.setItem("maintenance_custom", JSON.stringify(next));
  }

  function deleteCustomTask(id: string) {
    saveCustomTasks(customTasks.filter((t) => t.id !== id));
    // Also remove from records and disabled
    saveRecords(records.filter((r) => r.taskId !== id));
    saveDisabled(disabled.filter((d) => d !== id));
  }

  // Build task list with computed status (active tasks only)
  const allBuiltInTasks = useMemo(() => getMaintenanceTasks(engineMake, engineModel, engineType), [engineMake, engineModel, engineType]);

  const tasks = useMemo<TaskStatus[]>(() => {
    const combined: MaintenanceTask[] = [
      ...allBuiltInTasks,
      ...customTasks,
    ];
    return combined
      .filter((t) => !disabled.includes(t.id))
      .map((task) => {
        const rec = records.filter((r) => r.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date))[0];
        return { ...computeStatus(task, rec?.date ?? null), isCustom: (task as CustomTask).isCustom };
      })
      .sort((a, b) => {
        const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (orderDiff !== 0) return orderDiff;
        return (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999);
      });
  }, [records, disabled, customTasks, allBuiltInTasks]);

  // Hidden tasks list (for re-enabling)
  const hiddenTasks = useMemo<TaskStatus[]>(() => {
    const combined: MaintenanceTask[] = [
      ...allBuiltInTasks,
      ...customTasks,
    ];
    return combined
      .filter((t) => disabled.includes(t.id))
      .map((task) => {
        const rec = records.filter((r) => r.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date))[0];
        return { ...computeStatus(task, rec?.date ?? null), isCustom: (task as CustomTask).isCustom };
      });
  }, [records, disabled, customTasks, allBuiltInTasks]);

  // Summary counts
  const counts = useMemo(() => ({
    overdue:  tasks.filter((t) => t.status === "overdue" || t.status === "never").length,
    dueSoon:  tasks.filter((t) => t.status === "due-soon").length,
    ok:       tasks.filter((t) => t.status === "ok").length,
  }), [tasks]);

  // Filter
  const [filter, setFilter] = useState<StatusFilter>("all");
  const visible = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "overdue") return tasks.filter((t) => t.status === "overdue" || t.status === "never");
    if (filter === "due-soon") return tasks.filter((t) => t.status === "due-soon");
    return tasks.filter((t) => t.status === "ok");
  }, [tasks, filter]);

  // Show hidden section
  const [showHidden, setShowHidden] = useState(false);

  // Log service modal
  const [logTask, setLogTask] = useState<TaskStatus | null>(null);
  const [logDate, setLogDate] = useState<string>(TODAY.toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState<string>("");

  function openLog(task: TaskStatus) {
    setLogTask(task);
    setLogDate(TODAY.toISOString().slice(0, 10));
    setLogNotes("");
  }

  function handleSaveLog() {
    if (!logTask || !logDate) return;
    const next: ServiceRecord[] = [
      ...records.filter((r) => r.taskId !== logTask.id),
      { taskId: logTask.id, date: logDate, notes: logNotes.trim() || undefined },
    ];
    saveRecords(next);
    setLogTask(null);
  }

  // Add custom item modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<MaintenanceCategory>("Engine Oil & Fuel");
  const [newTaskInterval, setNewTaskInterval] = useState("12");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  function handleAddCustomTask() {
    const name = newTaskName.trim();
    const interval = parseInt(newTaskInterval, 10);
    if (!name || !interval || interval < 1) return;

    const newTask: CustomTask = {
      id: `custom_${Date.now()}`,
      task: name,
      category: newTaskCategory,
      intervalMonths: interval,
      notes: newTaskNotes.trim() || undefined,
      isCustom: true,
    };
    saveCustomTasks([...customTasks, newTask]);
    setShowAddModal(false);
    setNewTaskName("");
    setNewTaskCategory("Engine Oil & Fuel");
    setNewTaskInterval("12");
    setNewTaskNotes("");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground leading-tight">Maintenance Checklist</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              {boatName} · {boatInfo?.engineCount ? `${boatInfo.engineCount} ` : ""}{engineMake} {engineModel.replace(/\s*\(.*?\)$/, "")}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* ── Summary strip ────────────────────────────────────── */}
        <div className="flex gap-3 mt-4 mb-4">
          <div className="flex-1 bg-white rounded-xl border border-border px-4 py-3 text-center">
            <div className="text-2xl font-bold text-red-500">{counts.overdue}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Overdue</div>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-border px-4 py-3 text-center">
            <div className="text-2xl font-bold text-amber-500">{counts.dueSoon}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Due Soon</div>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-border px-4 py-3 text-center">
            <div className="text-2xl font-bold text-green-600">{counts.ok}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Up to Date</div>
          </div>
        </div>

        {/* ── Filter tabs ──────────────────────────────────────── */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
          {(["all", "overdue", "due-soon", "ok"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-black text-white"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "due-soon" ? "Due Soon" : f === "ok" ? "Up to Date" : "Overdue"}
              {f !== "all" && (
                <span className="ml-1.5 text-xs opacity-70">
                  {f === "overdue" ? counts.overdue : f === "due-soon" ? counts.dueSoon : counts.ok}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Task list ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {visible.map((task) => {
            const styles = STATUS_STYLES[task.status];
            const isUrgent = task.status === "overdue" || task.status === "never";

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-border overflow-hidden flex"
              >
                {/* Colored left bar */}
                <div className={`w-1 flex-shrink-0 ${styles.bar}`} />

                <div className="flex-1 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Task + category */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{CATEGORY_ICONS[task.category]}</span>
                        <span className="text-sm font-semibold text-foreground leading-snug">
                          {task.task}
                        </span>
                        {task.isCustom && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary leading-none">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{task.category}</p>

                      {/* Last serviced + interval */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Last:{" "}
                          <span className="text-foreground font-medium">
                            {task.lastDate ? formatDate(task.lastDate) : "—"}
                          </span>
                        </span>
                        <span className="text-border">·</span>
                        <span>Every {task.intervalMonths < 12 ? `${task.intervalMonths}mo` : task.intervalMonths === 12 ? "year" : `${task.intervalMonths / 12}yr`}</span>
                      </div>
                    </div>

                    {/* Status badge + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
                        {isUrgent && task.daysUntilDue !== null
                          ? `${Math.abs(task.daysUntilDue)}d overdue`
                          : task.status === "never"
                          ? "Never"
                          : task.status === "due-soon" && task.daysUntilDue !== null
                          ? `${task.daysUntilDue}d`
                          : "✓ OK"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openLog(task)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Log Service
                        </button>

                        {/* Hide button */}
                        <button
                          onClick={() => toggleDisabled(task.id)}
                          title="Hide this item"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>

                        {/* Delete button (custom tasks only) */}
                        {task.isCustom && (
                          <button
                            onClick={() => deleteCustomTask(task.id)}
                            title="Delete custom item"
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {task.notes && (
                    <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed border-t border-border/50 pt-2">
                      {task.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No tasks in this category.
            </div>
          )}
        </div>

        {/* ── Add custom item button ────────────────────────────── */}
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border bg-white text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add custom item
        </button>

        {/* ── Hidden items section ──────────────────────────────── */}
        {hiddenTasks.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Hidden items ({hiddenTasks.length})</span>
              <svg
                className={`w-4 h-4 transition-transform ${showHidden ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHidden && (
              <div className="flex flex-col gap-2 mt-2">
                {hiddenTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl border border-border overflow-hidden flex opacity-60"
                  >
                    <div className="w-1 flex-shrink-0 bg-gray-300" />
                    <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{CATEGORY_ICONS[task.category]}</span>
                        <span className="text-sm font-medium text-foreground truncate">{task.task}</span>
                        {task.isCustom && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary leading-none flex-shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.isCustom && (
                          <button
                            onClick={() => deleteCustomTask(task.id)}
                            title="Delete custom item"
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => toggleDisabled(task.id)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Log Service Modal ───────────────────────────────────── */}
      <Dialog open={!!logTask} onOpenChange={(v) => !v && setLogTask(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Service</DialogTitle>
          </DialogHeader>
          {logTask && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-lg">{CATEGORY_ICONS[logTask.category]}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{logTask.task}</p>
                  <p className="text-xs text-muted-foreground">{logTask.category}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Service Date
                </label>
                <input
                  type="date"
                  value={logDate}
                  max={TODAY.toISOString().slice(0, 10)}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Used Mercury Full Synthetic, changed at 312 hrs, no issues found…"
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setLogTask(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLog}
                  disabled={!logDate}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Custom Item Modal ────────────────────────────────── */}
      <Dialog open={showAddModal} onOpenChange={(v) => !v && setShowAddModal(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Task Name
              </label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="e.g. Replace EPIRB battery"
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Category
              </label>
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as MaintenanceCategory)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Interval (months)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={newTaskInterval}
                onChange={(e) => setNewTaskInterval(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {newTaskInterval === "12" ? "Every year" :
                 parseInt(newTaskInterval) === 24 ? "Every 2 years" :
                 parseInt(newTaskInterval) === 36 ? "Every 3 years" :
                 parseInt(newTaskInterval) % 12 === 0 ? `Every ${parseInt(newTaskInterval) / 12} years` :
                 `Every ${newTaskInterval} month${newTaskInterval === "1" ? "" : "s"}`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                placeholder="Any details about this task…"
                rows={2}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomTask}
                disabled={!newTaskName.trim() || !parseInt(newTaskInterval)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Add Item
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
