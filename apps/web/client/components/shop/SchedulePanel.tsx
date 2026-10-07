import { useMemo, useState } from "react";
import { occupiesDay, scheduleConflicts, toLocalDateKey, weekDays, type WorkOrder } from "@shared/shop";
import { cn } from "@/lib/utils";
import { WorkOrderBadge } from "./shopUi";

interface Props {
  orders: WorkOrder[];
  bays: string[];
  onOpen: (order: WorkOrder) => void;
  onNewAt: (dayKey: string, bay: string) => void;
}

const STATUS_BAR: Record<WorkOrder["status"], string> = {
  scheduled: "border-l-slate-400",
  "in-progress": "border-l-sky-500",
  "waiting-parts": "border-l-amber-500",
  completed: "border-l-emerald-500",
  invoiced: "border-l-violet-500",
};

function dayLabel(key: string) {
  const d = new Date(`${key}T12:00:00`);
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function hhmm(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function SchedulePanel({ orders, bays, onOpen, onNewAt }: Props) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [groupBy, setGroupBy] = useState<"bay" | "tech">("bay");
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const todayKey = toLocalDateKey(new Date().toISOString());

  const conflicts = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of scheduleConflicts(orders)) {
      ids.add(a);
      ids.add(b);
    }
    return ids;
  }, [orders]);

  const lanes = useMemo(() => {
    const fromOrders = orders.map((o) => (groupBy === "bay" ? o.bay : o.assignedTo)).filter(Boolean);
    const base = groupBy === "bay" ? bays : [];
    return [...new Set([...base, ...fromOrders]), "Unassigned"];
  }, [orders, bays, groupBy]);

  const unscheduled = orders.filter((o) => !o.scheduledStart && o.status !== "completed" && o.status !== "invoiced");

  const shift = (weeks: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + weeks * 7);
    setAnchor(d);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => shift(-1)} className="px-2.5 py-1.5 text-sm border border-border rounded-lg hover:bg-muted" aria-label="Previous week">←</button>
        <button onClick={() => setAnchor(new Date())} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">This week</button>
        <button onClick={() => shift(1)} className="px-2.5 py-1.5 text-sm border border-border rounded-lg hover:bg-muted" aria-label="Next week">→</button>
        <span className="text-sm font-semibold ml-1">
          {dayLabel(days[0]).date} – {dayLabel(days[6]).date}
        </span>
        <div className="ml-auto flex border border-border rounded-lg overflow-hidden text-xs">
          {(["bay", "tech"] as const).map((g) => (
            <button key={g} onClick={() => setGroupBy(g)} className={cn("px-3 py-1.5", groupBy === g ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              By {g}
            </button>
          ))}
        </div>
      </div>

      {conflicts.size > 0 && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {conflicts.size} jobs are double-booked on the same bay or tech. They're outlined in red.
        </p>
      )}

      <div className="overflow-x-auto border border-border rounded-xl bg-white">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-28 p-2 text-left font-semibold text-muted-foreground border-b border-border">{groupBy === "bay" ? "Bay" : "Tech"}</th>
              {days.map((k) => {
                const l = dayLabel(k);
                return (
                  <th key={k} className={cn("p-2 text-left font-semibold border-b border-l border-border", k === todayKey && "bg-sky-50")}>
                    <span className="text-muted-foreground">{l.dow}</span> <span className="text-foreground">{l.date}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr key={lane} className="align-top">
                <td className="p-2 font-medium text-foreground border-b border-border">{lane}</td>
                {days.map((k) => {
                  const cell = orders.filter((o) => {
                    const key = groupBy === "bay" ? o.bay : o.assignedTo;
                    const inLane = lane === "Unassigned" ? !key : key === lane;
                    return inLane && occupiesDay(o, k);
                  });
                  return (
                    <td key={k} className={cn("p-1.5 border-b border-l border-border h-20 group", k === todayKey && "bg-sky-50/40")}>
                      <div className="space-y-1">
                        {cell.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => onOpen(o)}
                            className={cn(
                              "w-full text-left bg-white border border-border border-l-4 rounded-md px-1.5 py-1 hover:shadow-sm",
                              STATUS_BAR[o.status],
                              conflicts.has(o.id) && "ring-2 ring-red-400"
                            )}
                          >
                            <p className="font-semibold text-foreground truncate">{o.title}</p>
                            <p className="text-muted-foreground truncate">
                              {hhmm(o.scheduledStart)} · {groupBy === "bay" ? o.assignedTo || "—" : o.bay || "—"}
                            </p>
                          </button>
                        ))}
                        {lane !== "Unassigned" && (
                          <button
                            onClick={() => onNewAt(k, groupBy === "bay" ? lane : "")}
                            className="w-full text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 text-[11px] py-0.5"
                          >
                            + Book
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unscheduled.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Not on the calendar</p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((o) => (
              <button key={o.id} onClick={() => onOpen(o)} className="flex items-center gap-2 text-xs border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted bg-white">
                <span className="font-mono text-muted-foreground">{o.number}</span>
                <span className="font-medium">{o.title}</span>
                <WorkOrderBadge status={o.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
