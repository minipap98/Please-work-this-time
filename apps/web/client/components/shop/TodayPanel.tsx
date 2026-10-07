import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  billingStep,
  occupiesDay,
  partsProgress,
  shipmentBoatKey,
  shopAlerts,
  toLocalDateKey,
  workOrderTotals,
  type AlertTone,
  type PartsShipment,
  type WorkOrder,
} from "@shared/shop";
import { cn } from "@/lib/utils";
import { useVendorBidProjects } from "@/hooks/use-marketplace";
import {
  useInventory,
  useReceiveShipment,
  useSetWorkOrderStatus,
  useShipments,
  useShopRealtime,
  useWorkOrders,
} from "@/hooks/use-shop";
import { ShipmentBadge, WorkOrderBadge, money } from "./shopUi";
import { Panel, StatGrid, StatTile } from "@/components/app/Page";
import { CalendarDays, Clock, DollarSign, Package, PackageCheck } from "lucide-react";

const TONE: Record<AlertTone, string> = {
  urgent: "bg-red-500",
  warn: "bg-amber-500",
  good: "bg-emerald-500",
  info: "bg-sky-500",
};

function hhmm(iso: string | null) {
  if (!iso) return "Any time";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function TodayPanel({ vendorId, coiExpiry }: { vendorId: string; coiExpiry?: string | null }) {
  const navigate = useNavigate();
  useShopRealtime(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);
  const { data: shipments = [] } = useShipments(vendorId);
  const { data: inventory = [] } = useInventory(vendorId);
  const { data: bidJobs = [] } = useVendorBidProjects(vendorId);
  const receive = useReceiveShipment(vendorId);
  const setStatus = useSetWorkOrderStatus(vendorId);

  const now = new Date();
  const todayKey = toLocalDateKey(now.toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow.toISOString());

  const wonNotOnBoard = useMemo(() => {
    const linked = new Set(orders.map((o) => o.projectId).filter(Boolean));
    return bidJobs.filter(
      (p) =>
        p.chosenBidId &&
        p.status !== "completed" &&
        !linked.has(p.id) &&
        p.bids.some((b) => b.id === p.chosenBidId && (b.vendorProfileId === vendorId || b.vendorName === vendorId))
    ).length;
  }, [bidJobs, orders, vendorId]);

  const alerts = useMemo(
    () => shopAlerts({ orders, shipments, inventory, wonJobsNotOnBoard: wonNotOnBoard, coiExpiry, today: now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, shipments, inventory, wonNotOnBoard, coiExpiry, todayKey]
  );

  const board = useMemo(() => {
    const active = orders.filter((o) => o.status !== "invoiced");
    const byStart = (a: WorkOrder, b: WorkOrder) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "");
    return [
      { key: todayKey, label: "Today", list: active.filter((o) => occupiesDay(o, todayKey)).sort(byStart) },
      { key: tomorrowKey, label: "Tomorrow", list: active.filter((o) => occupiesDay(o, tomorrowKey) && o.status !== "completed").sort(byStart) },
    ];
  }, [orders, todayKey, tomorrowKey]);

  const arriving = useMemo(() => {
    const due = shipments.filter(
      (s) => !s.receivedAt && (s.status === "out-for-delivery" || (s.eta !== null && s.eta <= todayKey))
    );
    const groups = new Map<string, PartsShipment[]>();
    for (const s of due) groups.set(shipmentBoatKey(s), [...(groups.get(shipmentBoatKey(s)) ?? []), s]);
    return [...groups.entries()].sort(([a], [b]) => (a === "stock" ? 1 : b === "stock" ? -1 : 0));
  }, [shipments, todayKey]);

  const money7 = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400_000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let week = 0;
    let ready = 0;
    let sentMonth = 0;
    for (const o of orders) {
      if (o.status !== "completed" && o.status !== "invoiced") continue;
      const total = workOrderTotals(o.lines, o.taxRate).total;
      const done = Date.parse(o.completedAt ?? o.createdAt);
      if (done >= weekAgo) week += total;
      if (billingStep(o) === "invoice") ready += total;
      if (o.exportedAt && Date.parse(o.exportedAt) >= monthStart) sentMonth += total;
    }
    return { week, ready, sentMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, todayKey]);

  const go = (tab: string, extra = "") => navigate(`/vendor-shop?tab=${tab}${extra}`);

  const waitingParts = orders.filter((o) => o.status === "waiting-parts").length;
  const arrivingCount = arriving.reduce((n, [, list]) => n + list.length, 0);
  const todayJobs = board[0].list.length;

  const runAlert = (a: (typeof alerts)[number]) => {
    if (a.action.workOrderId && a.action.label === "Start job") {
      setStatus.mutate(
        { id: a.action.workOrderId, status: "in-progress" },
        { onSuccess: () => toast.success("Job started"), onError: (e) => toast.error(String(e)) }
      );
    } else if (a.id === "coi") {
      navigate("/vendor-insights?tab=insurance");
    } else {
      go(a.action.tab);
    }
  };

  return (
    <div className="space-y-5">
      <StatGrid className="sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={<CalendarDays />} label="Board today" value={todayJobs} sub={`${board[1].list.length} tomorrow`} onClick={() => go("schedule")} />
        <StatTile icon={<Clock />} label="Waiting on parts" value={waitingParts} tone={waitingParts ? "warn" : "default"} onClick={() => go("orders")} />
        <StatTile icon={<Package />} label="Arriving" value={arrivingCount} sub="parts due today" onClick={() => go("parts")} />
        <StatTile icon={<DollarSign />} label="To invoice" value={money(money7.ready)} tone={money7.ready > 0 ? "warn" : "default"} onClick={() => go("orders")} />
        <StatTile icon={<PackageCheck />} label="Done this week" value={money(money7.week)} sub={`${money(money7.sentMonth)} in QuickBooks`} onClick={() => go("orders")} />
      </StatGrid>

      {/* Needs you now */}
      <Panel padded={false}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Needs you now</h2>
          <span className="text-xs text-muted-foreground">{alerts.length === 0 ? "All clear" : `${alerts.length} item${alerts.length === 1 ? "" : "s"}`}</span>
        </div>
        {alerts.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Nothing overdue, short or stuck.</p>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.slice(0, 7).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className={cn("w-2 h-2 rounded-full shrink-0", TONE[a.tone])} />
                <span className="text-sm text-foreground flex-1 min-w-0">{a.text}</span>
                <button
                  onClick={() => runAlert(a)}
                  className="shrink-0 text-xs font-semibold border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted"
                >
                  {a.action.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Board */}
        <Panel padded={false} className="lg:col-span-3">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">On the board</h2>
            <Link to="/vendor-shop?tab=schedule" className="text-xs text-sky-700 hover:underline font-semibold">
              Full schedule
            </Link>
          </div>
          {board.map((col) => (
            <div key={col.key}>
              <p className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {col.label} · {col.list.length} job{col.list.length === 1 ? "" : "s"}
              </p>
              {col.list.length === 0 ? (
                <p className="px-5 pb-3 text-sm text-muted-foreground">Open. A good day to take a new job.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {col.list.map((o) => {
                    const parts = partsProgress(o.id, shipments);
                    const partsNote =
                      parts.total === 0 ? null : parts.problems ? "delivery problem" : parts.open ? `parts ${parts.total - parts.open}/${parts.total} in` : "parts in";
                    return (
                      <li key={o.id}>
                        <button
                          onClick={() => go("orders", `&wo=${o.id}`)}
                          className="w-full text-left px-5 py-2.5 hover:bg-slate-50 flex items-center gap-3"
                        >
                          <span className="w-16 shrink-0 text-xs font-mono text-muted-foreground">{hhmm(o.scheduledStart)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-foreground truncate">{o.title}</span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {[o.boatLabel || o.customerName, o.bay, o.assignedTo].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          {partsNote && (
                            <span className={cn("hidden sm:inline text-[11px] font-medium", parts.problems ? "text-red-600" : parts.open ? "text-amber-700" : "text-emerald-700")}>
                              {partsNote}
                            </span>
                          )}
                          <WorkOrderBadge status={o.status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
          <div className="h-2" />
        </Panel>

        {/* Arriving */}
        <Panel padded={false} className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Arriving today</h2>
            <Link to="/vendor-shop?tab=parts" className="text-xs text-sky-700 hover:underline font-semibold">
              All parts
            </Link>
          </div>
          {arriving.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No deliveries due today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {arriving.flatMap(([key, list]) =>
                list.map((s) => (
                  <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{s.description || s.supplier || "Shipment"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {key === "stock" ? "Shop stock" : s.boatLabel || "Boat"}
                        {s.customerName ? ` · ${s.customerName}` : ""}
                      </p>
                      <div className="mt-1"><ShipmentBadge status={s.status} /></div>
                    </div>
                    <button
                      onClick={() =>
                        receive.mutate(s.id, {
                          onSuccess: () => toast.success("Checked in"),
                          onError: (e) => toast.error(String(e)),
                        })
                      }
                      className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Check in
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
