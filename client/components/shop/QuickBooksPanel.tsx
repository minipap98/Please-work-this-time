import { useMemo, useState } from "react";
import {
  inventoryToCsv,
  toQuickBooksIif,
  toQuickBooksOnlineCsv,
  workOrderTotals,
  type InventoryItem,
  type WorkOrder,
} from "@shared/shop";
import type { ShopSettings } from "@/data/shopDemoData";
import { EmptyState, downloadFile, inputCls, labelCls, money, shortDate } from "./shopUi";

interface Props {
  orders: WorkOrder[];
  inventory: InventoryItem[];
  settings: ShopSettings;
  onMarkExported: (ids: string[]) => void;
  onSaveSettings: (patch: Partial<ShopSettings>) => void;
}

function doneDate(o: WorkOrder) {
  return (o.completedAt ?? o.scheduledEnd ?? o.createdAt).slice(0, 10);
}

export default function QuickBooksPanel({ orders, inventory, settings, onMarkExported, onSaveSettings }: Props) {
  // Default range reaches back to the oldest completed job not yet in QuickBooks.
  const defaultFrom = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const start = monthStart.toLocaleDateString("en-CA");
    const oldest = orders
      .filter((o) => o.status === "completed" && !o.exportedAt)
      .map(doneDate)
      .sort()[0];
    return oldest && oldest < start ? oldest : start;
  }, [orders]);
  const [fromOverride, setFrom] = useState<string | null>(null);
  const from = fromOverride ?? defaultFrom;
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const [includeExported, setIncludeExported] = useState(false);
  const [items, setItems] = useState({
    laborItem: settings.qbLaborItem,
    partsItem: settings.qbPartsItem,
    feeItem: settings.qbFeeItem,
  });

  const eligible = useMemo(
    () =>
      orders
        .filter((o) => o.status === "completed" || o.status === "invoiced")
        .filter((o) => includeExported || !o.exportedAt)
        .filter((o) => {
          const d = doneDate(o);
          return d >= from && d <= to;
        })
        .sort((a, b) => doneDate(a).localeCompare(doneDate(b))),
    [orders, from, to, includeExported]
  );

  const sum = eligible.reduce(
    (acc, o) => {
      const t = workOrderTotals(o.lines, o.taxRate);
      acc.labor += t.labor;
      acc.parts += t.parts + t.fees;
      acc.tax += t.tax;
      acc.total += t.total;
      return acc;
    },
    { labor: 0, parts: 0, tax: 0, total: 0 }
  );

  const stamp = `${from}_to_${to}`;
  const download = (kind: "qbo" | "iif") => {
    if (eligible.length === 0) return;
    if (kind === "qbo") {
      downloadFile(`bosun-invoices-${stamp}.csv`, toQuickBooksOnlineCsv(eligible, items));
    } else {
      downloadFile(`bosun-invoices-${stamp}.iif`, toQuickBooksIif(eligible, items), "text/plain");
    }
    if (items.laborItem !== settings.qbLaborItem || items.partsItem !== settings.qbPartsItem || items.feeItem !== settings.qbFeeItem) {
      onSaveSettings({ qbLaborItem: items.laborItem, qbPartsItem: items.partsItem, qbFeeItem: items.feeItem });
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl p-4 bg-white">
        <p className="text-sm font-semibold">Export invoices to QuickBooks</p>
        <p className="text-sm text-muted-foreground mt-1">
          Completed work orders become QuickBooks invoices with labor, parts and fees on separate lines, so your books split service income from parts sales.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div>
            <label className={labelCls}>Completed from</label>
            <input className={inputCls} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input className={inputCls} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <label className="col-span-2 flex items-end gap-2 text-sm pb-2">
            <input type="checkbox" checked={includeExported} onChange={(e) => setIncludeExported(e.target.checked)} />
            Include already exported
          </label>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-sky-700 font-medium">Match your QuickBooks product/service names</summary>
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            <div>
              <label className={labelCls}>Labor item</label>
              <input className={inputCls} value={items.laborItem} onChange={(e) => setItems({ ...items, laborItem: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Parts item</label>
              <input className={inputCls} value={items.partsItem} onChange={(e) => setItems({ ...items, partsItem: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Fees item</label>
              <input className={inputCls} value={items.feeItem} onChange={(e) => setItems({ ...items, feeItem: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Names that don't exist yet are created by QuickBooks during import.</p>
        </details>
      </div>

      {eligible.length === 0 ? (
        <EmptyState title="Nothing to export in this range" body="Mark work orders Completed and they'll be ready to send to QuickBooks." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label={`${eligible.length} invoices`} value={money(sum.total)} />
            <Tile label="Service labor" value={money(sum.labor)} />
            <Tile label="Parts & fees" value={money(sum.parts)} />
            <Tile label="Sales tax" value={money(sum.tax)} />
          </div>
          <div className="border border-border rounded-xl bg-white divide-y divide-border">
            {eligible.map((o) => (
              <div key={o.id} className="flex items-center gap-3 p-2.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-16">{o.number}</span>
                <span className="text-xs text-muted-foreground w-14">{shortDate(doneDate(o))}</span>
                <span className="flex-1 truncate">{o.customerName || "Walk-in"} · {o.title}</span>
                {o.exportedAt && <span className="text-[10px] font-semibold text-violet-700">EXPORTED</span>}
                <span className="tabular-nums font-medium">{money(workOrderTotals(o.lines, o.taxRate).total)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => download("qbo")} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#2CA01C] text-white hover:opacity-90">
              Download for QuickBooks Online (.csv)
            </button>
            <button onClick={() => download("iif")} className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted">
              QuickBooks Desktop (.iif)
            </button>
            <button
              onClick={() => onMarkExported(eligible.filter((o) => !o.exportedAt).map((o) => o.id))}
              disabled={eligible.every((o) => o.exportedAt)}
              className="sm:ml-auto px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              Mark as exported
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            QuickBooks Online: Settings ⚙ → Import data → Invoices → upload the CSV. Desktop: File → Utilities → Import → IIF Files.
            Mark as exported afterwards so the next export doesn't double-post.
          </p>
        </>
      )}

      <div className="border border-border rounded-xl p-4 bg-white flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">Parts list for QuickBooks</p>
          <p className="text-xs text-muted-foreground">Products/Services import with SKU, cost, price and quantity on hand.</p>
        </div>
        <button
          onClick={() => downloadFile(`bosun-products-${new Date().toLocaleDateString("en-CA")}.csv`, inventoryToCsv(inventory))}
          className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
        >
          Download
        </button>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-xl p-3 bg-white">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
