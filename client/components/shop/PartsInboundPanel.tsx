import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SHIPMENT_STATUSES,
  carrierTrackingUrl,
  matchWorkOrderRef,
  parseShippingEmail,
  shipmentBoatKey,
  type Carrier,
  type InventoryItem,
  type ParsedShippingEmail,
  type PartsShipment,
  type ShipmentStatus,
  type WorkOrder,
  type ShopBoat,
  type ShopCustomer,
} from "@shared/shop";
import type { ShipmentDraft } from "@/hooks/use-shop";
import { EmptyState, ShipmentBadge, inputCls, labelCls, shortDate } from "./shopUi";
import BoatPicker, { type BoatTarget } from "./BoatPicker";

interface Props {
  shipments: PartsShipment[];
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  boats?: ShopBoat[];
  customers?: ShopCustomer[];
  inboundAddress: string | null;
  onSave: (draft: ShipmentDraft) => void;
  onReceive: (id: string) => void;
  onDelete: (id: string) => void;
  draftSeed: ShipmentDraft | null;
  onDraftSeedUsed: () => void;
  autoPaste?: boolean;
  onAutoPasteUsed?: () => void;
}

const CARRIERS: Carrier[] = ["UPS", "FedEx", "USPS", "DHL", "Other"];

export function blankShipment(): ShipmentDraft {
  return {
    supplier: "", description: "", carrier: "UPS", trackingNumber: "", status: "ordered",
    eta: null, workOrderId: null, boatLabel: "", customerName: "", inventoryItemId: null, quantity: 1, source: "manual", emailSubject: null,
  };
}

export default function PartsInboundPanel({
  shipments, inventory, workOrders, boats = [], customers = [], inboundAddress, onSave, onReceive, onDelete, draftSeed, onDraftSeedUsed,
  autoPaste, onAutoPasteUsed,
}: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<ShipmentDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const NO_BOAT: BoatTarget = { workOrderId: null, boatLabel: "", customerName: "" };
  const [pasteFor, setPasteFor] = useState<BoatTarget>(NO_BOAT);
  const [pasteForTouched, setPasteForTouched] = useState(false);

  useEffect(() => {
    if (!autoPaste) return;
    setPasteOpen(true);
    onAutoPasteUsed?.();
  }, [autoPaste, onAutoPasteUsed]);

  useEffect(() => {
    if (!draftSeed) return;
    setEditing(draftSeed);
    onDraftSeedUsed();
  }, [draftSeed, onDraftSeedUsed]);

  const parsed: ParsedShippingEmail | null = useMemo(
    () => (subject || body ? parseShippingEmail(subject, body, from) : null),
    [subject, body, from]
  );

  // A WO/PO number on the supplier email picks the boat automatically.
  const refMatch = useMemo(
    () => matchWorkOrderRef(parsed?.workOrderRef ?? null, workOrders),
    [parsed?.workOrderRef, workOrders]
  );
  useEffect(() => {
    if (pasteForTouched) return;
    setPasteFor(refMatch
      ? { workOrderId: refMatch.id, boatLabel: refMatch.boatLabel, customerName: refMatch.customerName }
      : NO_BOAT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refMatch, pasteForTouched]);

  const today = new Date().toLocaleDateString("en-CA");
  const open = shipments.filter((s) => !s.receivedAt);
  const arrivingToday = open.filter((s) => s.status === "out-for-delivery" || s.eta === today);
  const problems = open.filter((s) => s.status === "exception");
  const received = shipments.filter((s) => s.receivedAt).slice(0, 20);
  const woById = new Map(workOrders.map((w) => [w.id, w]));

  // Open shipments grouped by the boat they're for; shop stock last.
  const groups = useMemo(() => {
    const m = new Map<string, PartsShipment[]>();
    for (const s of open) {
      const k = shipmentBoatKey(s);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()].sort(([a], [b]) => (a === "stock" ? 1 : b === "stock" ? -1 : 0));
  }, [open]);

  function importParsed() {
    if (!parsed) return;
    for (const s of parsed.shipments) {
      onSave({
        ...blankShipment(),
        supplier: parsed.supplier ?? "",
        description: parsed.orderNumber ? `Order ${parsed.orderNumber}` : subject.slice(0, 120),
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        status: parsed.status === "ordered" ? "shipped" : parsed.status,
        eta: parsed.eta,
        source: "email",
        emailSubject: subject || null,
        ...pasteFor,
      });
    }
    setPasteFor(NO_BOAT);
    setPasteForTouched(false);
    setSubject("");
    setFrom("");
    setBody("");
    setPasteOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl p-4 bg-white">
        <p className="text-sm font-semibold">Connect your email</p>
        {inboundAddress ? (
          <>
            <p className="text-sm text-muted-foreground mt-1">
              Forward supplier and carrier emails here. Bosun reads tracking numbers, ETAs, and delivery updates and keeps this board current.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <code className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 truncate">{inboundAddress}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(inboundAddress);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-sky-700 font-medium">Set up auto-forwarding (2 minutes)</summary>
              <ol className="list-decimal ml-5 mt-2 space-y-1 text-muted-foreground">
                <li><b>Gmail:</b> Settings → Forwarding and POP/IMAP → Add a forwarding address → paste the address above. Bosun confirms it automatically.</li>
                <li>Create a filter: <code className="text-xs bg-muted px-1 rounded">from:(ups.com OR fedex.com OR usps.com OR dhl.com OR westmarine.com OR defender.com) </code> or <code className="text-xs bg-muted px-1 rounded">subject:(shipped OR tracking OR "out for delivery")</code> → Forward to the address.</li>
                <li><b>Outlook / Microsoft 365:</b> Settings → Mail → Rules → Add rule → "Forward to" the address.</li>
                <li>Add your parts counter or service writer inbox the same way — every email lands on one board.</li>
              </ol>
            </details>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            Auto-forwarding isn't enabled on this Bosun install yet. Paste shipping emails below and Bosun pulls out the tracking numbers.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={() => setPasteOpen(true)} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground">Paste an email</button>
          <button onClick={() => setEditing(blankShipment())} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">+ Add tracking #</button>
        </div>
      </div>

      {(arrivingToday.length > 0 || problems.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {arrivingToday.length > 0 && (
            <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-indigo-900">Arriving today: {arrivingToday.length}</p>
              <p className="text-indigo-800/80 text-xs mt-0.5">{arrivingToday.map((s) => `${s.description || s.supplier} → ${s.boatLabel || "stock"}`).join(" · ")}</p>
            </div>
          )}
          {problems.length > 0 && (
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-red-900">Delivery problems: {problems.length}</p>
              <p className="text-red-800/80 text-xs mt-0.5">Call the supplier before the customer calls you.</p>
            </div>
          )}
        </div>
      )}

      {open.length === 0 ? (
        <EmptyState title="Nothing inbound" body="Shipments show up here as soon as a forwarded email or pasted tracking number comes in." />
      ) : (
        <div className="space-y-4">
          {groups.map(([key, list]) => {
            const first = list[0];
            const wo = first.workOrderId ? woById.get(first.workOrderId) : undefined;
            const isStock = key === "stock";
            return (
              <section key={key}>
                <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">
                    {isStock ? "Shop stock" : first.boatLabel || "Boat not named"}
                  </h3>
                  {!isStock && (
                    <span className="text-xs text-muted-foreground">
                      {[first.customerName, wo ? `${wo.number} · ${wo.title}` : "no work order yet"].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{list.length} inbound</span>
                </div>
                <div className="space-y-2">
                  {list.map((s) => (
                    <ShipmentRow
                      key={s.id}
                      s={s}
                      stockName={s.inventoryItemId ? inventory.find((i) => i.id === s.inventoryItemId)?.name : undefined}
                      onEdit={() => setEditing({ ...s })}
                      onReceive={() => onReceive(s.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {received.length > 0 && (
        <details>
          <summary className="text-sm font-semibold cursor-pointer">Received ({received.length})</summary>
          <div className="mt-2 space-y-1">
            {received.map((s) => (
              <div key={s.id} className="text-xs text-muted-foreground flex gap-2">
                <span>{shortDate(s.receivedAt)}</span>
                <span className="text-foreground">{s.description || s.supplier}</span>
                <span>{s.boatLabel ? `→ ${s.boatLabel}` : "→ stock"}</span>
                <span className="font-mono">{s.trackingNumber}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Paste a shipping email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>From</label>
              <input className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="West Marine <orders@westmarine.com>" />
            </div>
            <div>
              <label className={labelCls}>Subject</label>
              <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email body</label>
              <textarea className={inputCls} rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste the whole email…" />
            </div>
            {parsed && (
              <div className="text-sm border border-border rounded-lg p-3 bg-muted/40">
                {parsed.shipments.length === 0 ? (
                  <p className="text-muted-foreground">No tracking number found yet. UPS (1Z…) and USPS numbers are detected anywhere; FedEx and DHL need the carrier named in the email.</p>
                ) : (
                  <ul className="space-y-1">
                    {parsed.shipments.map((s) => (
                      <li key={s.trackingNumber}><b>{s.carrier}</b> <span className="font-mono">{s.trackingNumber}</span></li>
                    ))}
                    <li className="text-muted-foreground">
                      {SHIPMENT_STATUSES.find((x) => x.value === parsed.status)?.label}
                      {parsed.eta && ` · ETA ${shortDate(parsed.eta)}`}
                      {parsed.supplier && ` · ${parsed.supplier}`}
                      {parsed.orderNumber && ` · Order ${parsed.orderNumber}`}
                    </li>
                  </ul>
                )}
              </div>
            )}
            <div className="border-t border-border pt-3">
              <BoatPicker
                value={pasteFor}
                onChange={(v) => { setPasteFor(v); setPasteForTouched(true); }}
                workOrders={workOrders}
                boats={boats}
                customers={customers}
              />
              {refMatch && pasteFor.workOrderId === refMatch.id && (
                <p className="text-[11px] text-emerald-700 mt-1">Matched {refMatch.number} from the PO/WO number on the email.</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                disabled={!parsed || parsed.shipments.length === 0}
                onClick={importParsed}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                Add to inbound
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit shipment" : "Track a shipment"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <BoatPicker
                  value={{ workOrderId: editing.workOrderId, boatLabel: editing.boatLabel, customerName: editing.customerName }}
                  onChange={(v) => setEditing({ ...editing, ...v })}
                  workOrders={workOrders}
                  boats={boats}
                  customers={customers}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>What's coming</label>
                <input className={inputCls} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Supplier</label>
                <input className={inputCls} value={editing.supplier} onChange={(e) => setEditing({ ...editing, supplier: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Carrier</label>
                <select className={inputCls} value={editing.carrier} onChange={(e) => setEditing({ ...editing, carrier: e.target.value as Carrier })}>
                  {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tracking #</label>
                <input className={inputCls} value={editing.trackingNumber} onChange={(e) => setEditing({ ...editing, trackingNumber: e.target.value.trim() })} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as ShipmentStatus })}>
                  {SHIPMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>ETA</label>
                <input className={inputCls} type="date" value={editing.eta ?? ""} onChange={(e) => setEditing({ ...editing, eta: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Restocks part</label>
                <select className={inputCls} value={editing.inventoryItemId ?? ""} onChange={(e) => setEditing({ ...editing, inventoryItemId: e.target.value || null })}>
                  <option value="">— None —</option>
                  {inventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Qty</label>
                <input className={inputCls} type="number" min={1} value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) || 1 })} />
              </div>
              <div className="col-span-2 flex items-center justify-between pt-2">
                {editing.id ? (
                  <button onClick={() => { onDelete(editing.id!); setEditing(null); }} className="text-sm text-red-600 hover:underline">Delete</button>
                ) : <span />}
                <button
                  onClick={() => { onSave(editing); setEditing(null); }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground"
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

function ShipmentRow({
  s, stockName, onEdit, onReceive,
}: { s: PartsShipment; stockName?: string; onEdit: () => void; onReceive: () => void }) {
  const url = carrierTrackingUrl(s.carrier, s.trackingNumber);
  return (
    <div className="border border-border rounded-xl p-3 bg-white flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <ShipmentBadge status={s.status} />
          <span className="text-xs text-muted-foreground">{s.carrier}</span>
          {s.source === "email" && <span className="text-[10px] font-semibold text-sky-700">FROM EMAIL</span>}
        </div>
        <p className="text-sm font-semibold mt-1 truncate">{s.description || "Shipment"}{s.supplier && <span className="font-normal text-muted-foreground"> · {s.supplier}</span>}</p>
        <p className="text-xs text-muted-foreground">
          {s.trackingNumber ? (
            url ? <a href={url} target="_blank" rel="noreferrer" className="font-mono text-sky-700 hover:underline">{s.trackingNumber}</a> : <span className="font-mono">{s.trackingNumber}</span>
          ) : "No tracking yet"}
          {s.eta && ` · ETA ${shortDate(s.eta)}`}
          {stockName && ` · restocks ${s.quantity}× ${stockName}`}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onEdit} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted">Edit</button>
        <button onClick={onReceive} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
          Check in
        </button>
      </div>
    </div>
  );
}
