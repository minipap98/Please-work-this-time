import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inventoryToCsv, isLowStock, type InventoryItem } from "@shared/shop";
import type { InventoryDraft } from "@/hooks/use-shop";
import { cn } from "@/lib/utils";
import { EmptyState, downloadFile, inputCls, labelCls, money } from "./shopUi";

interface Props {
  items: InventoryItem[];
  live: boolean;
  onAdjust: (id: string, delta: number) => void;
  onSave: (item: InventoryDraft) => void;
  onDelete: (id: string) => void;
  onReorder: (item: InventoryItem) => void;
  saving: boolean;
}

const BLANK: InventoryDraft = {
  sku: "", name: "", category: "", binLocation: "", qtyOnHand: 0, reorderPoint: 0,
  unitCost: 0, unitPrice: 0, supplier: "",
};

export default function InventoryPanel({ items, live, onAdjust, onSave, onDelete, onReorder, saving }: Props) {
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<InventoryDraft | null>(null);

  const low = items.filter(isLowStock);
  const value = items.reduce((s, i) => s + Math.max(0, i.qtyOnHand) * i.unitCost, 0);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => !lowOnly || isLowStock(i))
      .filter((i) => !needle || [i.name, i.sku, i.category, i.binLocation, i.supplier].some((f) => f.toLowerCase().includes(needle)));
  }, [items, q, lowOnly]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="SKUs" value={String(items.length)} />
        <Stat label="At / below reorder" value={String(low.length)} tone={low.length ? "warn" : undefined} />
        <Stat label="Stock value (cost)" value={money(value)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part, SKU, bin, supplier…"
          className="sm:w-72 px-3 py-1.5 text-sm border border-border rounded-lg bg-background"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
        {live && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live across devices
          </span>
        )}
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={() => downloadFile(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, inventoryToCsv(items))}
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
          >
            Export CSV
          </button>
          <button onClick={() => setEditing({ ...BLANK })} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground">
            + Part
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No parts yet" body="Add the filters, impellers, anodes and fluids you stock. Parts used on work orders come off the shelf automatically." />
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-semibold p-2.5">Part</th>
                <th className="text-left font-semibold p-2.5">Bin</th>
                <th className="text-center font-semibold p-2.5">On hand</th>
                <th className="text-right font-semibold p-2.5">Cost</th>
                <th className="text-right font-semibold p-2.5">Price</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const lowStock = isLowStock(i);
                return (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="p-2.5">
                      <button onClick={() => setEditing(i)} className="text-left">
                        <p className="font-medium text-foreground hover:underline">{i.name}</p>
                        <p className="text-xs text-muted-foreground">{[i.sku, i.supplier].filter(Boolean).join(" · ")}</p>
                      </button>
                    </td>
                    <td className="p-2.5 text-muted-foreground">{i.binLocation || "—"}</td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onAdjust(i.id, -1)} className="w-7 h-7 border border-border rounded-md hover:bg-muted" aria-label={`Use one ${i.name}`}>−</button>
                        <span className={cn("w-10 text-center font-semibold tabular-nums", lowStock && "text-amber-700", i.qtyOnHand < 0 && "text-red-600")}>
                          {i.qtyOnHand}
                        </span>
                        <button onClick={() => onAdjust(i.id, 1)} className="w-7 h-7 border border-border rounded-md hover:bg-muted" aria-label={`Add one ${i.name}`}>+</button>
                      </div>
                      {lowStock && <p className="text-[10px] text-center text-amber-700 mt-0.5">Reorder at {i.reorderPoint}</p>}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-muted-foreground">{money(i.unitCost)}</td>
                    <td className="p-2.5 text-right tabular-nums">{money(i.unitPrice)}</td>
                    <td className="p-2.5 text-right">
                      {lowStock && (
                        <button onClick={() => onReorder(i)} className="text-xs font-medium text-sky-700 hover:underline whitespace-nowrap">
                          Track reorder
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit part" : "Add part"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" className="col-span-2" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="SKU / part #" value={editing.sku} onChange={(v) => setEditing({ ...editing, sku: v })} />
              <Field label="Category" value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} />
              <Field label="Bin / shelf" value={editing.binLocation} onChange={(v) => setEditing({ ...editing, binLocation: v })} />
              <Field label="Supplier" value={editing.supplier} onChange={(v) => setEditing({ ...editing, supplier: v })} />
              <Field label="On hand" type="number" value={String(editing.qtyOnHand)} onChange={(v) => setEditing({ ...editing, qtyOnHand: Number(v) || 0 })} />
              <Field label="Reorder at" type="number" value={String(editing.reorderPoint)} onChange={(v) => setEditing({ ...editing, reorderPoint: Number(v) || 0 })} />
              <Field label="Unit cost" type="number" value={String(editing.unitCost)} onChange={(v) => setEditing({ ...editing, unitCost: Number(v) || 0 })} />
              <Field label="Sell price" type="number" value={String(editing.unitPrice)} onChange={(v) => setEditing({ ...editing, unitPrice: Number(v) || 0 })} />
              <div className="col-span-2 flex items-center justify-between pt-2">
                {editing.id ? (
                  <button onClick={() => { onDelete(editing.id!); setEditing(null); }} className="text-sm text-red-600 hover:underline">Delete</button>
                ) : <span />}
                <button
                  disabled={!editing.name.trim() || saving}
                  onClick={() => { onSave(editing); setEditing(null); }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={cn("border rounded-xl p-3 bg-white", tone === "warn" ? "border-amber-200 bg-amber-50/50" : "border-border")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", tone === "warn" && "text-amber-700")}>{value}</p>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", className,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
