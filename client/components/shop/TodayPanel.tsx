import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
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
import { ShipmentBadge, money } from "./shopUi";

const TONE: Record<AlertTone, { dot: string; row: string }> = {
  urgent: { dot: "bg-red-500", row: "border-red-200 bg-red-50/60" },
  warn: { dot: "bg-amber-500", row: "border-amber-200 bg-amber-50/50" },
  good: { dot: "bg-emerald-500", row: "border-emerald-200 bg-emerald-50/60" },
  info: { dot: "bg-sky-500", row: "border-sky-200 bg-sky-50/50" },
};

function hhmm(iso: string | null) {
  if (!iso) return "Any time";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function serviceType(title: string): string {
  const t = title.toLowerCase();
  if (/paint|bottom|hull|gelcoat|wax|detail|zinc|anode|fiberglass/.test(t)) return "Hull & bottom";
  if (/electr|battery|wiring|electronics|stereo|radar|gps|charger/.test(t)) return "Electrical";
  if (/canvas|upholster|interior|cushion/.test(t)) return "Canvas & interior";
  if (/engine|service|oil|impeller|pump|outboard|inboard|verado|yamaha|lower unit|fuel|tune|winteriz|commission/.test(t)) return "Engine & mechanical";
  return "Other";
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
    const byType = new Map<string, number>();
    for (const o of orders) {
      if (o.status !== "completed" && o.status !== "invoiced") continue;
      const total = workOrderTotals(o.lines, o.taxRate).total;
      const done = Date.parse(o.completedAt ?? o.createdAt);
      if (done >= weekAgo) {
        week += total;
        byType.set(serviceType(o.title), (byType.get(serviceType(o.title)) ?? 0) + total);
      }
      if (o.status === "completed" && !o.exportedAt) ready += total;
      if (o.exportedAt && Date.parse(o.exportedAt) >= monthStart) sentMonth += total;
    }
    const types = [...byType.entries()].sort((a, b) => b[1] - a[1]);
    return { week, ready, sentMonth, types };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, todayKey]);

  const go = (tab: string, extra = "") => navigate(`/vendor-shop?tab=${tab}${extra}`);

  return (
    <div className="space-y-5">
      {/* Needs you now */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2">Needs you now</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 py-3 bg-white">
            All clear. Nothing overdue, short or stuck.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {alerts.slice(0, 7).map((a) => (
              <li key={a.id} className={cn("flex items-center gap-3 border rounded-xl px-3 py-2.5", TONE[a.tone].row)}>
                <span className={cn("w-2 h-2 rounded-full shrink-0", TONE[a.tone].dot)} />
                <span className="text-sm text-foreground flex-1 min-w-0">{a.text}</span>
                <button
                  onClick={() => {
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
                  }}
                  className="shrink-0 text-xs font-semibold bg-white border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted"
                >
                  {a.action.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Board */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">On the board</h2>
            <Link to="/vendor-shop?tab=schedule" className="text-xs text-sky-600 hover:text-sky-700 font-medium">
              Full schedule
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {board.map((col) => (
              <div key={col.key} className="bg-white border border-border rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {col.label} · {col.list.length} job{col.list.length === 1 ? "" : "s"}
                </p>
                {col.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3">Open. A good day to take a new job.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {col.list.map((o) => {
                      const parts = partsProgress(o.id, shipments);
                      const partsDot =
                        parts.total === 0 ? "" : parts.problems ? "bg-red-500" : parts.open ? "bg-amber-500" : "bg-emerald-500";
                      return (
                        <li key={o.id}>
                          <button
                            onClick={() => go("orders", `&wo=${o.id}`)}
                            className="w-full text-left border border-border rounded-lg px-2.5 py-2 hover:border-sky-300"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-muted-foreground">{hhmm(o.scheduledStart)}</span>
                              {partsDot && <span className={cn("w-1.5 h-1.5 rounded-full", partsDot)} title="Parts status" />}
                              {o.status === "completed" && <span className="text-[10px] font-semibold text-emerald-700">DONE</span>}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{o.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[o.boatLabel || o.customerName, o.bay, o.assignedTo].filter(Boolean).join(" · ")}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Arriving + money */}
        <div className="lg:col-span-2 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Arriving today</h2>
              <Link to="/vendor-shop?tab=parts" className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                All parts
              </Link>
            </div>
            {arriving.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-white border border-border rounded-xl px-3 py-3">
                No deliveries due today.
              </p>
            ) : (
              <div className="space-y-2">
                {arriving.map(([key, list]) => (
                  <div key={key} className="bg-white border border-border rounded-xl p-3">
                    <p className="text-xs font-semibold text-foreground mb-1.5">
                      {key === "stock" ? "Shop stock" : list[0].boatLabel || "Boat"}
                      {list[0].customerName && <span className="font-normal text-muted-foreground"> · {list[0].customerName}</span>}
                    </p>
                    <ul className="space-y-1.5">
                      {list.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{s.description || s.supplier || "Shipment"}</p>
                            <ShipmentBadge status={s.status} />
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
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-border rounded-xl p-3">
            <h2 className="text-sm font-semibold text-foreground mb-2">Money</h2>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => go("orders")} className="text-left">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Done this week</p>
                <p className="text-base font-bold tabular-nums">{money(money7.week)}</p>
              </button>
              <button onClick={() => go("quickbooks")} className="text-left">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ready to invoice</p>
                <p className={cn("text-base font-bold tabular-nums", money7.ready > 0 && "text-amber-700")}>{money(money7.ready)}</p>
              </button>
              <button onClick={() => go("quickbooks")} className="text-left">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">In QuickBooks</p>
                <p className="text-base font-bold tabular-nums">{money(money7.sentMonth)}</p>
                <p className="text-[10px] text-muted-foreground">this month</p>
              </button>
            </div>
            {money7.types.length > 0 && (
              <div className="mt-3 space-y-1">
                {money7.types.map(([type, amt]) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="w-32 text-muted-foreground truncate">{type}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${Math.max(4, (amt / money7.week) * 100)}%` }} />
                    </div>
                    <span className="tabular-nums w-16 text-right">{money(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
