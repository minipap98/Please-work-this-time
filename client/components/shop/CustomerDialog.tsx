import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BoatDraft, CustomerDraft } from "@/hooks/use-shop";
import { boatLabel, type ShopBoat, type ShopCustomer } from "@shared/shop";
import { inputCls, labelCls } from "./shopUi";

export const blankBoat = (): BoatDraft => ({ name: "", year: null, make: "", model: "", engine: "", hullId: "", slip: "" });
const blankCustomer = (): CustomerDraft => ({ name: "", email: "", phone: "", notes: "" });

/**
 * Add a customer and their boat (or edit one on file). The boat's year/make/model build the
 * label the work order and QuickBooks carry, so nothing is typed twice.
 */
export default function CustomerDialog({
  open,
  onOpenChange,
  customer,
  boats = [],
  prefill,
  saving,
  onSave,
  onDeleteBoat,
  onDeleteCustomer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Editing an existing customer; omit to add one. */
  customer?: ShopCustomer | null;
  /** The boats already on file for that customer. */
  boats?: ShopBoat[];
  /** Starting values when adding (e.g. from a won Bosun job). */
  prefill?: { customer?: Partial<CustomerDraft>; boat?: Partial<BoatDraft> };
  saving: boolean;
  onSave: (payload: { customer: CustomerDraft; boats: BoatDraft[] }) => void;
  onDeleteBoat?: (id: string) => void;
  onDeleteCustomer?: () => void;
}) {
  const [c, setC] = useState<CustomerDraft>(blankCustomer());
  const [bs, setBs] = useState<BoatDraft[]>([blankBoat()]);

  useEffect(() => {
    if (!open) return;
    if (customer) {
      setC({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, notes: customer.notes });
      setBs(boats.length ? boats.map((b) => ({ ...b })) : [blankBoat()]);
    } else {
      setC({ ...blankCustomer(), ...prefill?.customer });
      setBs([{ ...blankBoat(), ...prefill?.boat }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  const setBoat = (i: number, patch: Partial<BoatDraft>) => setBs((xs) => xs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const boatOk = (b: BoatDraft) => !!(b.name.trim() || b.make.trim() || b.model.trim());
  const canSave = c.name.trim().length > 0 && bs.every(boatOk);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? customer.name : "New customer"}</DialogTitle>
          <DialogDescription>
            {customer ? "Contact details and the boats you service for them." : "Who they are and the boat you'll be working on."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Customer name</label>
            <input className={inputCls} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Name as it appears in QuickBooks" autoFocus={!customer} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes (private to the shop)</label>
            <input className={inputCls} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} placeholder="Gate code, preferred contact, billing quirks" />
          </div>
        </div>

        <div className="space-y-3">
          {bs.map((b, i) => (
            <div key={b.id ?? i} className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{bs.length > 1 ? `Boat ${i + 1}` : "Boat"}{boatOk(b) && <span className="ml-2 font-normal text-muted-foreground">{boatLabel(b)}</span>}</p>
                {(bs.length > 1 || b.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (b.id && onDeleteBoat) onDeleteBoat(b.id);
                      setBs((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : [blankBoat()]));
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className={labelCls}>Year</label>
                  <input className={inputCls} type="number" min={1900} max={2100} value={b.year ?? ""} onChange={(e) => setBoat(i, { year: e.target.value ? Number(e.target.value) : null })} placeholder="2021" />
                </div>
                <div>
                  <label className={labelCls}>Make</label>
                  <input className={inputCls} value={b.make} onChange={(e) => setBoat(i, { make: e.target.value })} placeholder="Grady-White" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Model</label>
                  <input className={inputCls} value={b.model} onChange={(e) => setBoat(i, { model: e.target.value })} placeholder="Canyon 336" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Boat name</label>
                  <input className={inputCls} value={b.name} onChange={(e) => setBoat(i, { name: e.target.value })} placeholder="Reel Therapy" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Engines</label>
                  <input className={inputCls} value={b.engine} onChange={(e) => setBoat(i, { engine: e.target.value })} placeholder="Twin Yamaha F300" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Hull ID (HIN)</label>
                  <input className={inputCls} value={b.hullId} onChange={(e) => setBoat(i, { hullId: e.target.value.toUpperCase() })} placeholder="NGW12345L021" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Slip / where she lives</label>
                  <input className={inputCls} value={b.slip} onChange={(e) => setBoat(i, { slip: e.target.value })} placeholder="Pier 66, slip C-14" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setBs((xs) => [...xs, blankBoat()])} className="text-xs font-semibold text-sky-700 hover:underline">
            + Another boat for this customer
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          {customer && onDeleteCustomer ? (
            <button type="button" onClick={onDeleteCustomer} className="text-sm text-red-600 hover:underline">Delete customer</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button
              type="button"
              disabled={!canSave || saving}
              onClick={() => onSave({ customer: c, boats: bs.filter(boatOk) })}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : customer ? "Save changes" : "Add customer"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
