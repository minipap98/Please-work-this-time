import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getMaintenanceTasks,
  DEFAULT_SERVICE_RECORDS,
  type MaintenanceCategory,
  type MaintenanceTask,
  type ServiceRecord,
} from "@/data/maintenanceData";

// ─── Category Icons ───────────────────────────────────────────
function CategoryIcon({ category, className = "w-4 h-4" }: { category: MaintenanceCategory; className?: string }) {
  const cls = `${className} text-muted-foreground flex-shrink-0`;
  const props = { fill: "none" as const, stroke: "currentColor", viewBox: "0 0 24 24", className: cls };
  const p = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.5 };

  if (category === "Engine Oil & Fuel") return (
    <svg {...props}><path {...p} d="M12 2c-3 4-6 7-6 10a6 6 0 0012 0c0-3-3-6-6-10z" /></svg>
  );
  if (category === "Cooling System") return (
    <svg {...props}><path {...p} d="M12 3v18M3 12h18M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66" /></svg>
  );
  if (category === "Drivetrain") return (
    <svg {...props}>
      <path {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path {...p} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  if (category === "Electrical & Safety") return (
    <svg {...props}><path {...p} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
  );
  return (
    <svg {...props}><path {...p} d="M12 2a3 3 0 110 6 3 3 0 010-6zm0 4v12M5 11h14M5 18c1.5 2 3.5 3 7 3s5.5-1 7-3" /></svg>
  );
}

// ─── Types ───────────────────────────────────────────────────
type StatusFilter = "all" | "overdue" | "due-soon" | "ok";

interface TaskStatus extends MaintenanceTask {
  lastDate: string | null;
  lastServiceHours: number | null;
  nextDueDate: Date | null;
  nextDueHours: number | null;
  daysUntilDue: number | null;
  hoursUntilDue: number | null;
  status: "overdue" | "due-soon" | "ok" | "never";
  isCustom?: boolean;
}

interface CustomTask {
  id: string;
  task: string;
  category: MaintenanceCategory;
  intervalMonths: number;
  intervalHours?: number;
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

const DISPLAY_GROUPS: { name: string; iconCategory: MaintenanceCategory; categories: MaintenanceCategory[] }[] = [
  { name: "Engine & Propulsion", iconCategory: "Drivetrain",          categories: ["Engine Oil & Fuel", "Cooling System", "Drivetrain"] },
  { name: "Electrical & Safety", iconCategory: "Electrical & Safety", categories: ["Electrical & Safety"] },
  { name: "Hull & Bottom",       iconCategory: "Hull & Bottom",       categories: ["Hull & Bottom"] },
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
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatInterval(months: number, hours?: number): string {
  const timePart = months < 12
    ? `${months}mo`
    : months === 12 ? "1yr" : `${months / 12}yr`;
  if (!hours) return `Every ${timePart}`;
  return `Every ${hours} hrs or ${timePart}`;
}

function computeStatus(
  task: MaintenanceTask,
  lastDate: string | null,
  currentHours: number | null,
  lastServiceHours: number | null,
): TaskStatus {
  // Time-based
  let timeStatus: TaskStatus["status"] = "never";
  let daysUntilDue: number | null = null;
  let nextDueDate: Date | null = null;

  if (lastDate) {
    const last = new Date(lastDate);
    const next = addMonths(last, task.intervalMonths);
    daysUntilDue = daysBetween(TODAY, next);
    nextDueDate = next;
    timeStatus = daysUntilDue < 0 ? "overdue" : daysUntilDue <= 60 ? "due-soon" : "ok";
  }

  // Hours-based (only if task has intervalHours, we know current hours, and have a last service hours)
  let hoursUntilDue: number | null = null;
  let nextDueHours: number | null = null;
  let hoursStatus: TaskStatus["status"] | null = null;

  if (task.intervalHours && currentHours !== null && lastServiceHours !== null) {
    nextDueHours = lastServiceHours + task.intervalHours;
    hoursUntilDue = nextDueHours - currentHours;
    const buffer = Math.max(task.intervalHours * 0.2, 10);
    hoursStatus = hoursUntilDue < 0 ? "overdue" : hoursUntilDue <= buffer ? "due-soon" : "ok";
  }

  // Take the most urgent status
  const PRIORITY: Record<TaskStatus["status"], number> = { overdue: 0, never: 1, "due-soon": 2, ok: 3 };
  let status: TaskStatus["status"];
  if (hoursStatus !== null && PRIORITY[hoursStatus] < PRIORITY[timeStatus]) {
    status = hoursStatus;
  } else {
    status = timeStatus;
  }

  return { ...task, lastDate, lastServiceHours, nextDueDate, nextDueHours, daysUntilDue, hoursUntilDue, status };
}

function getBadgeText(task: TaskStatus): string {
  if (task.status === "never") return "Never";
  if (task.status === "ok") return "✓ OK";

  const hoursOverdue = task.intervalHours && task.hoursUntilDue !== null && task.hoursUntilDue < 0;
  const hoursDueSoon = task.intervalHours && task.hoursUntilDue !== null && task.hoursUntilDue >= 0;

  if (task.status === "overdue") {
    if (hoursOverdue) return `${Math.abs(Math.round(task.hoursUntilDue!))} hrs over`;
    if (task.daysUntilDue !== null) return `${Math.abs(task.daysUntilDue)}d overdue`;
    return "Overdue";
  }
  if (task.status === "due-soon") {
    if (hoursDueSoon && task.hoursUntilDue !== null && task.daysUntilDue !== null) {
      // Show whichever is sooner
      return task.hoursUntilDue < task.daysUntilDue ? `${Math.round(task.hoursUntilDue)} hrs` : `${task.daysUntilDue}d`;
    }
    if (hoursDueSoon && task.hoursUntilDue !== null) return `${Math.round(task.hoursUntilDue)} hrs`;
    if (task.daysUntilDue !== null) return `${task.daysUntilDue}d`;
    return "Due soon";
  }
  return "";
}

const STATUS_ORDER: Record<TaskStatus["status"], number> = { overdue: 0, never: 1, "due-soon": 2, ok: 3 };

const STATUS_STYLES: Record<TaskStatus["status"], { bar: string; badge: string }> = {
  overdue:    { bar: "bg-red-500",   badge: "bg-red-50 text-red-600 border border-red-200" },
  never:      { bar: "bg-red-400",   badge: "bg-red-50 text-red-500 border border-red-200" },
  "due-soon": { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  ok:         { bar: "bg-green-500", badge: "bg-green-50 text-green-700 border border-green-200" },
};

// ─── Component ───────────────────────────────────────────────
export default function MaintenancePage() {
  const navigate = useNavigate();

  const boatInfo = useMemo(() => {
    try {
      const stored = localStorage.getItem("my_boat");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }, []);

  const engineMake  = boatInfo?.engineMake  ?? "Mercury";
  const engineModel = boatInfo?.engineModel ?? "Verado 250 (2021–present)";
  const engineType  = boatInfo?.engineType  ?? "Outboard";
  const boatName    = boatInfo?.name ?? [boatInfo?.year, boatInfo?.make, boatInfo?.model].filter(Boolean).join(" ") ?? "My Boat";

  // Service records
  const [records, setRecords] = useState<ServiceRecord[]>(() => {
    try {
      const stored = localStorage.getItem("maintenance_records");
      return stored ? JSON.parse(stored) : DEFAULT_SERVICE_RECORDS;
    } catch { return DEFAULT_SERVICE_RECORDS; }
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
    } catch { return []; }
  });

  function saveDisabled(next: string[]) {
    setDisabled(next);
    localStorage.setItem("maintenance_disabled", JSON.stringify(next));
  }

  function toggleDisabled(id: string) {
    saveDisabled(disabled.includes(id) ? disabled.filter((d) => d !== id) : [...disabled, id]);
  }

  // Custom tasks
  const [customTasks, setCustomTasks] = useState<CustomTask[]>(() => {
    try {
      const stored = localStorage.getItem("maintenance_custom");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  function saveCustomTasks(next: CustomTask[]) {
    setCustomTasks(next);
    localStorage.setItem("maintenance_custom", JSON.stringify(next));
  }

  function deleteCustomTask(id: string) {
    saveCustomTasks(customTasks.filter((t) => t.id !== id));
    saveRecords(records.filter((r) => r.taskId !== id));
    saveDisabled(disabled.filter((d) => d !== id));
  }

  // Engine hours
  const [currentEngineHours, setCurrentEngineHours] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem("maintenance_engine_hours");
      return stored ? JSON.parse(stored) : 312; // demo default
    } catch { return null; }
  });
  const [editingHours, setEditingHours] = useState(false);
  const [hoursInputValue, setHoursInputValue] = useState(() => currentEngineHours?.toString() ?? "");
  const hoursInputRef = useRef<HTMLInputElement>(null);

  function commitHours() {
    const val = parseFloat(hoursInputValue);
    const next = isNaN(val) || val < 0 ? null : Math.round(val * 10) / 10;
    setCurrentEngineHours(next);
    localStorage.setItem("maintenance_engine_hours", JSON.stringify(next));
    setEditingHours(false);
  }

  // Build task list
  const allBuiltInTasks = useMemo(
    () => getMaintenanceTasks(engineMake, engineModel, engineType),
    [engineMake, engineModel, engineType]
  );

  const tasks = useMemo<TaskStatus[]>(() => {
    const combined: MaintenanceTask[] = [...allBuiltInTasks, ...customTasks];
    return combined
      .filter((t) => !disabled.includes(t.id))
      .map((task) => {
        const rec = records
          .filter((r) => r.taskId === task.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return {
          ...computeStatus(task, rec?.date ?? null, currentEngineHours, rec?.engineHours ?? null),
          isCustom: (task as CustomTask).isCustom,
        };
      })
      .sort((a, b) => {
        const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return d !== 0 ? d : (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999);
      });
  }, [records, disabled, customTasks, allBuiltInTasks, currentEngineHours]);

  const hiddenTasks = useMemo<TaskStatus[]>(() => {
    const combined: MaintenanceTask[] = [...allBuiltInTasks, ...customTasks];
    return combined
      .filter((t) => disabled.includes(t.id))
      .map((task) => {
        const rec = records
          .filter((r) => r.taskId === task.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return {
          ...computeStatus(task, rec?.date ?? null, currentEngineHours, rec?.engineHours ?? null),
          isCustom: (task as CustomTask).isCustom,
        };
      });
  }, [records, disabled, customTasks, allBuiltInTasks, currentEngineHours]);

  const counts = useMemo(() => ({
    overdue:  tasks.filter((t) => t.status === "overdue" || t.status === "never").length,
    dueSoon:  tasks.filter((t) => t.status === "due-soon").length,
    ok:       tasks.filter((t) => t.status === "ok").length,
  }), [tasks]);

  // Filter
  const [filter, setFilter] = useState<StatusFilter>("all");
  const visible = useMemo(() => {
    if (filter === "all")      return tasks;
    if (filter === "overdue")  return tasks.filter((t) => t.status === "overdue" || t.status === "never");
    if (filter === "due-soon") return tasks.filter((t) => t.status === "due-soon");
    return tasks.filter((t) => t.status === "ok");
  }, [tasks, filter]);

  // Group by display group
  const groupedVisible = useMemo(() => {
    return DISPLAY_GROUPS.map((group) => {
      const groupTasks = visible.filter((t) => group.categories.includes(t.category));
      return {
        ...group,
        tasks: groupTasks,
        overdueCount: groupTasks.filter((t) => t.status === "overdue" || t.status === "never").length,
        dueSoonCount: groupTasks.filter((t) => t.status === "due-soon").length,
      };
    }).filter((g) => g.tasks.length > 0);
  }, [visible]);

  // Collapse state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  function isGroupCollapsed(name: string, _overdueCount: number, _dueSoonCount: number) {
    if (name in collapsed) return collapsed[name];
    return true; // collapsed by default
  }
  function toggleCollapsed(name: string, current: boolean) {
    setCollapsed((prev) => ({ ...prev, [name]: !current }));
  }

  const [showHidden, setShowHidden] = useState(false);

  // Log service modal
  const [logTask, setLogTask] = useState<TaskStatus | null>(null);
  const [logDate, setLogDate] = useState(TODAY.toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState("");
  const [logNotes, setLogNotes] = useState("");

  function openLog(task: TaskStatus) {
    setLogTask(task);
    setLogDate(TODAY.toISOString().slice(0, 10));
    setLogHours(currentEngineHours?.toString() ?? "");
    setLogNotes("");
  }

  function handleSaveLog() {
    if (!logTask || !logDate) return;
    const engineHours = parseFloat(logHours);
    const next: ServiceRecord[] = [
      ...records.filter((r) => r.taskId !== logTask.id),
      {
        taskId: logTask.id,
        date: logDate,
        engineHours: !isNaN(engineHours) && engineHours >= 0 ? engineHours : undefined,
        notes: logNotes.trim() || undefined,
      },
    ];
    saveRecords(next);
    setLogTask(null);
  }

  // Add custom item modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<MaintenanceCategory>("Engine Oil & Fuel");
  const [newTaskInterval, setNewTaskInterval] = useState("12");
  const [newTaskHours, setNewTaskHours] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  function handleAddCustomTask() {
    const name = newTaskName.trim();
    const interval = parseInt(newTaskInterval, 10);
    if (!name || !interval || interval < 1) return;
    const intervalHours = parseInt(newTaskHours, 10);
    const newTask: CustomTask = {
      id: `custom_${Date.now()}`,
      task: name,
      category: newTaskCategory,
      intervalMonths: interval,
      intervalHours: !isNaN(intervalHours) && intervalHours > 0 ? intervalHours : undefined,
      notes: newTaskNotes.trim() || undefined,
      isCustom: true,
    };
    saveCustomTasks([...customTasks, newTask]);
    setShowAddModal(false);
    setNewTaskName("");
    setNewTaskCategory("Engine Oil & Fuel");
    setNewTaskInterval("12");
    setNewTaskHours("");
    setNewTaskNotes("");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ── */}
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
        {/* ── Summary strip ── */}
        <div className="flex gap-3 mt-4 mb-3">
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

        {/* ── Engine hours row ── */}
        <div className="flex items-center gap-2 bg-white rounded-xl border border-border px-4 py-2.5 mb-4">
          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-muted-foreground">Engine Hours</span>
          {editingHours ? (
            <div className="flex items-center gap-2 ml-auto">
              <input
                ref={hoursInputRef}
                type="number"
                min="0"
                step="1"
                value={hoursInputValue}
                onChange={(e) => setHoursInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitHours(); if (e.key === "Escape") setEditingHours(false); }}
                className="w-24 border border-border rounded-md px-2 py-1 text-sm text-right text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">hrs</span>
              <button onClick={commitHours} className="text-xs font-medium text-primary hover:underline">Save</button>
              <button onClick={() => setEditingHours(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setHoursInputValue(currentEngineHours?.toString() ?? ""); setEditingHours(true); }}
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
            >
              {currentEngineHours !== null ? `${currentEngineHours} hrs` : "Set hours"}
              <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Filter tabs ── */}
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

        {/* ── Task list (collapsible groups) ── */}
        <div className="flex flex-col gap-3">
          {groupedVisible.map(({ name, iconCategory, tasks: groupTasks, overdueCount, dueSoonCount }) => {
            const isCollapsed = isGroupCollapsed(name, overdueCount, dueSoonCount);
            return (
              <div key={name} className="bg-white rounded-xl border border-border overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleCollapsed(name, isCollapsed)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <CategoryIcon category={iconCategory} className="w-3.5 h-3.5 text-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {overdueCount > 0 && <span className="text-xs text-red-500 font-medium">{overdueCount} overdue</span>}
                      {dueSoonCount > 0 && <span className="text-xs text-amber-600 font-medium">{dueSoonCount} due soon</span>}
                      {overdueCount === 0 && dueSoonCount === 0 && <span className="text-xs text-green-600 font-medium">All up to date</span>}
                      <span className="text-xs text-muted-foreground">· {groupTasks.length} items</span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Task rows */}
                {!isCollapsed && (
                  <div className="flex flex-col divide-y divide-border border-t border-border">
                    {groupTasks.map((task) => {
                      const styles = STATUS_STYLES[task.status];
                      return (
                        <div key={task.id} className="flex">
                          <div className={`w-1 flex-shrink-0 ${styles.bar}`} />
                          <div className="flex-1 px-4 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Task name */}
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-sm font-semibold text-foreground leading-snug">{task.task}</span>
                                  {task.isCustom && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary leading-none">Custom</span>
                                  )}
                                </div>
                                {/* Last service + interval */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  <span>
                                    Last:{" "}
                                    <span className="text-foreground font-medium">
                                      {task.lastDate ? formatDate(task.lastDate) : "—"}
                                    </span>
                                    {task.lastServiceHours !== null && (
                                      <span className="text-muted-foreground/70"> ({task.lastServiceHours} hrs)</span>
                                    )}
                                  </span>
                                  <span className="text-border">·</span>
                                  <span>{formatInterval(task.intervalMonths, task.intervalHours)}</span>
                                </div>
                              </div>

                              {/* Badge + actions */}
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
                                  {getBadgeText(task)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openLog(task)}
                                    className="text-xs font-medium text-primary hover:underline"
                                  >
                                    Log Service
                                  </button>
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
                            {task.notes && (
                              <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed border-t border-border/50 pt-2">
                                {task.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {groupedVisible.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No tasks in this category.</div>
          )}
        </div>

        {/* ── Add custom item button ── */}
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border bg-white text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add custom item
        </button>

        {/* ── Hidden items ── */}
        {hiddenTasks.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Hidden items ({hiddenTasks.length})</span>
              <svg className={`w-4 h-4 transition-transform ${showHidden ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHidden && (
              <div className="flex flex-col gap-2 mt-2">
                {hiddenTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-xl border border-border overflow-hidden flex opacity-60">
                    <div className="w-1 flex-shrink-0 bg-gray-300" />
                    <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CategoryIcon category={task.category} className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{task.task}</span>
                        {task.isCustom && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary leading-none flex-shrink-0">Custom</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.isCustom && (
                          <button onClick={() => deleteCustomTask(task.id)} title="Delete custom item" className="text-muted-foreground hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => toggleDisabled(task.id)} className="text-xs font-medium text-primary hover:underline">Restore</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Log Service Modal ── */}
      <Dialog open={!!logTask} onOpenChange={(v) => !v && setLogTask(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Log Service</DialogTitle></DialogHeader>
          {logTask && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <CategoryIcon category={logTask.category} className="w-5 h-5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{logTask.task}</p>
                  <p className="text-xs text-muted-foreground">{logTask.category}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Service Date</label>
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
                  Engine Hours <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    placeholder={currentEngineHours?.toString() ?? "e.g. 312"}
                    className="flex-1 border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground flex-shrink-0">hrs</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Engine hours at time of service</p>
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
                <button onClick={() => setLogTask(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveLog} disabled={!logDate} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Custom Item Modal ── */}
      <Dialog open={showAddModal} onOpenChange={(v) => !v && setShowAddModal(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Custom Item</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Task Name</label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="e.g. Replace EPIRB battery"
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Category</label>
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as MaintenanceCategory)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Time Interval</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newTaskInterval}
                    onChange={(e) => setNewTaskInterval(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground flex-shrink-0">mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {newTaskInterval === "12" ? "1 year" :
                   parseInt(newTaskInterval) === 24 ? "2 years" :
                   parseInt(newTaskInterval) === 36 ? "3 years" :
                   parseInt(newTaskInterval) % 12 === 0 ? `${parseInt(newTaskInterval) / 12} years` :
                   `${newTaskInterval} month${newTaskInterval === "1" ? "" : "s"}`}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Hours Interval <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground flex-shrink-0">hrs</span>
                </div>
              </div>
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
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
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
