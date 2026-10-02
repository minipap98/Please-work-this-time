import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  WORK_ORDER_STATUSES,
  workOrderTotals,
  type InventoryItem,
  type LineKind,
  type WorkOrder,
  type WorkOrderLine,
  type WorkOrderStatus,
} from "@shared/shop";
import type { ShopSettings } from "@/data/shopDemoData";
import type { WorkOrderDraft } from "@/hooks/use-shop";
import { fromLocalInput, inputCls, labelCls, money, toLocalInput } from "./shopUi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: WorkOrderDraft;
  inventory: InventoryItem[];
  settings: ShopSettings;
  saving: boolean;
  onSave: (draft: WorkOrderDraft) => void;
  onDelete?: () => void;
}

export function blankWorkOrder(number: string, settings: ShopSettings): WorkOrderDraft {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12);
  return {
    number,
    title: "",
    description: "",
    status: "scheduled",
    customerName: "",
    customerEmail: "",
    boatLabel: "",
    projectId: null,
    assignedTo: settings.techs[0] ?? "",
    bay: settings.bays[0] ?? "",
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    engineHours: null,
    taxRate: settings.taxRate,
    lines: [{ kind: "labor", description: "Labor", quantity: 1, unitPrice: settings.laborRate }],
  };
}

export function draftFromOrder(o: WorkOrder): WorkOrderDraft {
  const { createdAt: _c, completedAt: _d, exportedAt: _e, ...rest } = o;
  return rest;
}

export default function WorkOrderEditor({
  open, onOpenChange, initial, inventory, settings, saving, onSave, onDelete,
}: Props) {
  const [d, setD] = useState<WorkOrderDraft>(initial);
  useEffect(() => setD(initial), [initial]);

  const totals = useMemo(() => workOrderTotals(d.lines, d.taxRate), [d.lines, d.taxRate]);
  const set = <K extends keyof WorkOrderDraft>(k: K, v: WorkOrderDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setLine = (i: number, patch: Partial<WorkOrderLine>) =>
    setD((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addLine = (kind: LineKind) =>
    setD((p) => ({
      ...p,
      lines: [
        ...p.lines,
        { kind, description: kind === "labor" ? "Labor" : kind === "fee" ? "Shop supplies" : "", quantity: 1, unitPrice: kind === "labor" ? settings.laborRate : 0 },
      ],
    }));
  const removeLine = (i: number) => setD((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }));

  const stockById = useMemo(() => new Map(inventory.map((i) => [i.id, i])), [inventory]);
  const reservedOnThisOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of initial.lines) {
      if (l.kind === "part" && l.inventoryItemId) m.set(l.inventoryItemId, (m.get(l.inventoryItemId) ?? 0) + l.quantity);
    }
    return m;
  }, [initial.lines]);

  const canSave = d.title.trim().length > 0 && d.lines.every((l) => l.description.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.id ? `Work order ${d.number}` : "New work order"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Job</label>
            <input className={inputCls} value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="100-hour service, twin Yamaha F300" />
          </div>
          <div>
            <label className={labelCls}>Customer</label>
            <input className={inputCls} value={d.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Name as it appears in QuickBooks" />
          </div>
          <div>
            <label className={labelCls}>Customer email</label>
            <input className={inputCls} type="email" value={d.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Boat</label>
            <input className={inputCls} value={d.boatLabel} onChange={(e) => set("boatLabel", e.target.value)} placeholder="2019 Pursuit S 288 · Slip C-14" />
          </div>
          <div>
            <label className={labelCls}>Engine hours at intake</label>
            <input className={inputCls} type="number" min={0} value={d.engineHours ?? ""} onChange={(e) => set("engineHours", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Start</label>
            <input className={inputCls} type="datetime-local" value={toLocalInput(d.scheduledStart)} onChange={(e) => set("scheduledStart", fromLocalInput(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>End</label>
            <input className={inputCls} type="datetime-local" value={toLocalInput(d.scheduledEnd)} onChange={(e) => set("scheduledEnd", fromLocalInput(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Tech</label>
            <input className={inputCls} list="shop-techs" value={d.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} />
            <datalist id="shop-techs">{settings.techs.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <label className={labelCls}>Bay / location</label>
            <input className={inputCls} list="shop-bays" value={d.bay} onChange={(e) => set("bay", e.target.value)} />
            <datalist id="shop-bays">{settings.bays.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={d.status} onChange={(e) => set("status", e.target.value as WorkOrderStatus)}>
              {WORK_ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Parts tax %</label>
            <input className={inputCls} type="number" min={0} step="0.01" value={d.taxRate} onChange={(e) => set("taxRate", Number(e.target.value) || 0)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes (shows in the owner's boat log)</label>
            <textarea className={inputCls} rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="Found weeping raw-water pump seal, recommend replacing at next haul." />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Labor & parts</p>
            <div className="flex gap-1.5">
              {(["labor", "part", "fee"] as LineKind[]).map((k) => (
                <button key={k} type="button" onClick={() => addLine(k)} className="text-xs font-medium border border-border rounded-md px-2 py-1 hover:bg-muted">
                  + {k === "labor" ? "Labor" : k === "part" ? "Part" : "Fee"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {d.lines.map((l, i) => {
              const stock = l.inventoryItemId ? stockById.get(l.inventoryItemId) : undefined;
              const available = stock ? stock.qtyOnHand + (reservedOnThisOrder.get(stock.id) ?? 0) : null;
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-start border border-border rounded-lg p-2">
                  <span className="col-span-12 sm:col-span-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground pt-2.5">{l.kind}</span>
                  <div className="col-span-12 sm:col-span-5">
                    {l.kind === "part" ? (
                      <>
                        <select
                          className={inputCls}
                          value={l.inventoryItemId ?? ""}
                          onChange={(e) => {
                            const item = stockById.get(e.target.value);
                            setLine(i, item
                              ? { inventoryItemId: item.id, description: item.name, unitPrice: item.unitPrice }
                              : { inventoryItemId: null });
                          }}
                        >
                          <option value="">Special order / not stocked</option>
                          {inventory.map((it) => (
                            <option key={it.id} value={it.id}>{it.name} · {it.qtyOnHand} on hand</option>
                          ))}
                        </select>
                        {!l.inventoryItemId && (
                          <input className={`${inputCls} mt-1.5`} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Part description / number" />
                        )}
                        {available !== null && l.quantity > available && (
                          <p className="text-[11px] text-amber-700 mt-1">Only {available} in stock. Order more from Parts.</p>
                        )}
                      </>
                    ) : (
                      <input className={inputCls} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                    )}
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input className={inputCls} type="number" min={0} step={l.kind === "labor" ? "0.25" : "1"} value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })} aria-label={l.kind === "labor" ? "Hours" : "Quantity"} />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input className={inputCls} type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} aria-label="Rate" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                    <span className="text-sm font-medium tabular-nums">{money(l.quantity * l.unitPrice)}</span>
                    <button type="button" onClick={() => removeLine(i)} className="text-muted-foreground hover:text-red-600 text-lg leading-none" aria-label="Remove line">×</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 ml-auto max-w-xs text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Labor ({totals.laborHours} hrs)</span><span className="tabular-nums">{money(totals.labor)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Parts</span><span className="tabular-nums">{money(totals.parts)}</span></div>
            {totals.fees > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Fees</span><span className="tabular-nums">{money(totals.fees)}</span></div>}
            {totals.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{money(totals.tax)}</span></div>}
            <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Total</span><span className="tabular-nums">{money(totals.total)}</span></div>
          </div>
        </div>

        {d.projectId && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            Linked to a Bosun job. When you mark this completed, the itemized record is added to the owner's boat log.
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:underline">Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button
              type="button"
              disabled={!canSave || saving}
              onClick={() => onSave(d)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save work order"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
