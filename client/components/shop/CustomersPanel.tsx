import { useMemo, useState } from "react";
import { Anchor, Mail, Phone, Plus } from "lucide-react";
import { boatLabel, type ShopBoat, type ShopCustomer, type WorkOrder } from "@shared/shop";
import { EmptyState, inputCls } from "./shopUi";

/** Everyone the shop works for, with their boats. Click one to edit; start a work order from a boat. */
export default function CustomersPanel({
  customers,
  boats,
  orders,
  onAdd,
  onEdit,
  onWorkOrder,
}: {
  customers: ShopCustomer[];
  boats: ShopBoat[];
  orders: WorkOrder[];
  onAdd: () => void;
  onEdit: (c: ShopCustomer) => void;
  onWorkOrder: (c: ShopCustomer, b: ShopBoat) => void;
}) {
  const [q, setQ] = useState("");
  const boatsByCustomer = useMemo(() => {
    const m = new Map<string, ShopBoat[]>();
    for (const b of boats) m.set(b.customerId, [...(m.get(b.customerId) ?? []), b]);
    return m;
  }, [boats]);
  const jobsByBoat = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) if (o.boatId) m.set(o.boatId, (m.get(o.boatId) ?? 0) + 1);
    return m;
  }, [orders]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...customers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((c) => {
        if (!needle) return true;
        const bs = boatsByCustomer.get(c.id) ?? [];
        return [c.name, c.email, c.phone, ...bs.map((b) => `${boatLabel(b)} ${b.hullId} ${b.engine}`)].some((f) => f.toLowerCase().includes(needle));
      });
  }, [customers, boatsByCustomer, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers, boats, hull IDs…" className={`${inputCls} sm:w-72`} />
        <button onClick={onAdd} className="sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground whitespace-nowrap">
          <Plus className="w-4 h-4" /> New customer
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={customers.length === 0 ? "No customers on file yet" : "No customers match"}
          body={customers.length === 0 ? "Add a customer and their boat once; every work order after that picks them from a list." : "Try a name, boat, or hull ID."}
          action={customers.length === 0 ? <button onClick={onAdd} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground">Add your first customer</button> : undefined}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((c) => {
            const bs = boatsByCustomer.get(c.id) ?? [];
            return (
              <li key={c.id} className="rounded-xl border border-border bg-white shadow-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button onClick={() => onEdit(c)} className="text-sm font-semibold text-foreground hover:text-sky-700 text-left">{c.name}</button>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {c.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    </div>
                  </div>
                  <button onClick={() => onEdit(c)} className="text-xs font-medium border border-border rounded-lg px-2.5 py-1 hover:bg-muted shrink-0">Edit</button>
                </div>
                {bs.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No boat on file. <button onClick={() => onEdit(c)} className="text-sky-700 hover:underline">Add one</button></p>
                ) : (
                  <ul className="mt-3 divide-y divide-border border-t border-border">
                    {bs.map((b) => (
                      <li key={b.id} className="py-2 flex items-center gap-3">
                        <Anchor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground truncate">{boatLabel(b)}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {[b.engine, b.hullId && `HIN ${b.hullId}`, b.slip, jobsByBoat.get(b.id) ? `${jobsByBoat.get(b.id)} work order${jobsByBoat.get(b.id) === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <button onClick={() => onWorkOrder(c, b)} className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap">+ Work order</button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
