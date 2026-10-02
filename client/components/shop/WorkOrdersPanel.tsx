import { useMemo, useState } from "react";
import { WORK_ORDER_STATUSES, workOrderTotals, type WorkOrder, type WorkOrderStatus } from "@shared/shop";
import type { Project } from "@/data/projectData";
import { EmptyState, WorkOrderBadge, money, timeRange } from "./shopUi";

type Filter = "open" | "all" | WorkOrderStatus;

interface Props {
  orders: WorkOrder[];
  wonJobs: Project[];
  onOpen: (order: WorkOrder) => void;
  onNew: () => void;
  onFromJob: (job: Project) => void;
  onStatus: (id: string, status: WorkOrderStatus) => void;
}

const OPEN: WorkOrderStatus[] = ["scheduled", "in-progress", "waiting-parts"];

export default function WorkOrdersPanel({ orders, wonJobs, onOpen, onNew, onFromJob, onStatus }: Props) {
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");

  const linkedProjectIds = useMemo(() => new Set(orders.map((o) => o.projectId).filter(Boolean)), [orders]);
  const unlinkedJobs = wonJobs.filter((j) => !linkedProjectIds.has(j.id));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders
      .filter((o) => (filter === "all" ? true : filter === "open" ? OPEN.includes(o.status) : o.status === filter))
      .filter((o) =>
        !needle ||
        [o.number, o.title, o.customerName, o.boatLabel, o.assignedTo].some((f) => f.toLowerCase().includes(needle))
      )
      .sort((a, b) => (a.scheduledStart ?? "9").localeCompare(b.scheduledStart ?? "9"));
  }, [orders, filter, q]);

  return (
    <div className="space-y-4">
      {unlinkedJobs.length > 0 && (
        <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3">
          <p className="text-sm font-semibold text-emerald-900">Won on Bosun — not on the board yet</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unlinkedJobs.map((j) => (
              <button
                key={j.id}
                onClick={() => onFromJob(j)}
                className="text-xs font-medium bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100"
              >
                + {j.title}{j.boat ? ` · ${j.boat.year} ${j.boat.make}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {([{ value: "open", label: "Open" }, ...WORK_ORDER_STATUSES, { value: "all", label: "All" }] as { value: Filter; label: string }[]).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 whitespace-nowrap border ${filter === f.value ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search WO#, customer, boat, tech…"
          className="sm:ml-auto sm:w-64 px-3 py-1.5 text-sm border border-border rounded-lg bg-background"
        />
        <button onClick={onNew} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-foreground text-background whitespace-nowrap">
          + Work order
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No work orders here"
          body="Write up jobs as they come in — walk-ins, slip customers, and Bosun jobs all live on one board."
        />
      ) : (
        <div className="space-y-2">
          {shown.map((o) => {
            const t = workOrderTotals(o.lines, o.taxRate);
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(o)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(o)}
                className="border border-border rounded-xl p-3 sm:p-4 hover:border-foreground/30 cursor-pointer bg-white"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{o.number}</span>
                      <WorkOrderBadge status={o.status} />
                      {o.projectId && <span className="text-[10px] font-semibold text-emerald-700">BOSUN JOB</span>}
                      {o.exportedAt && <span className="text-[10px] font-semibold text-violet-700">IN QUICKBOOKS</span>}
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1 truncate">{o.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[o.customerName, o.boatLabel].filter(Boolean).join(" · ") || "No customer"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeRange(o.scheduledStart, o.scheduledEnd)}
                      {o.bay && ` · ${o.bay}`}
                      {o.assignedTo && ` · ${o.assignedTo}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{money(t.total)}</p>
                    <p className="text-[11px] text-muted-foreground">{t.laborHours} hrs labor</p>
                    <select
                      value={o.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onStatus(o.id, e.target.value as WorkOrderStatus)}
                      className="mt-2 text-xs border border-border rounded-md px-1.5 py-1 bg-background"
                      aria-label="Change status"
                    >
                      {WORK_ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
