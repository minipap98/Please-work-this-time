import type { ShipmentStatus, WorkOrderStatus } from "@shared/shop";
import { cn } from "@/lib/utils";

export function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function downloadFile(filename: string, contents: string, type = "text/csv") {
  const blob = new Blob([contents], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeRange(start: string | null, end: string | null) {
  if (!start) return "Unscheduled";
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const day = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (!end) return `${day} · ${s.toLocaleTimeString("en-US", opts)}`;
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay
    ? `${day} · ${s.toLocaleTimeString("en-US", opts)}–${e.toLocaleTimeString("en-US", opts)}`
    : `${day} → ${e.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const WO_STYLES: Record<WorkOrderStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700 border-slate-200",
  "in-progress": "bg-sky-50 text-sky-700 border-sky-200",
  "waiting-parts": "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  invoiced: "bg-violet-50 text-violet-700 border-violet-200",
};

const WO_LABELS: Record<WorkOrderStatus, string> = {
  scheduled: "Scheduled",
  "in-progress": "In progress",
  "waiting-parts": "Waiting on parts",
  completed: "Completed",
  invoiced: "Invoiced",
};

export function WorkOrderBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap", WO_STYLES[status])}>
      {WO_LABELS[status]}
    </span>
  );
}

const SH_STYLES: Record<ShipmentStatus, string> = {
  ordered: "bg-slate-100 text-slate-700 border-slate-200",
  shipped: "bg-sky-50 text-sky-700 border-sky-200",
  "out-for-delivery": "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  exception: "bg-red-50 text-red-700 border-red-200",
};

const SH_LABELS: Record<ShipmentStatus, string> = {
  ordered: "Ordered",
  shipped: "In transit",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
};

export function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap", SH_STYLES[status])}>
      {SH_LABELS[status]}
    </span>
  );
}

export const inputCls =
  "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400";

export const labelCls = "block text-xs font-semibold text-muted-foreground mb-1";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-border rounded-xl py-12 px-6 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
