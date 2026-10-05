import { useState } from "react";
import { boatLabel, type ShopBoat, type ShopCustomer, type WorkOrder } from "@shared/shop";
import { inputCls, labelCls } from "./shopUi";

export interface BoatTarget {
  workOrderId: string | null;
  boatLabel: string;
  customerName: string;
}

const OTHER = "__other__";

/** Which boat a part is for: a work order on the board, a boat without one yet, or shop stock. */
export default function BoatPicker({
  value,
  onChange,
  workOrders,
  boats = [],
  customers = [],
  label = "Ordered for",
}: {
  value: BoatTarget;
  onChange: (v: BoatTarget) => void;
  workOrders: WorkOrder[];
  boats?: ShopBoat[];
  customers?: ShopCustomer[];
  label?: string;
}) {
  const customerName = (b: ShopBoat) => customers.find((c) => c.id === b.customerId)?.name ?? "";
  const onFile = boats.map((b) => ({ id: `boat:${b.id}`, boatLabel: boatLabel(b), customerName: customerName(b) }));
  const onFileMatch = !value.workOrderId && value.boatLabel ? onFile.find((b) => b.boatLabel === value.boatLabel && b.customerName === value.customerName) : undefined;
  const open = workOrders.filter((w) => w.status !== "invoiced" || w.id === value.workOrderId);
  // "Another boat" stays selected while its fields are still empty.
  const [otherPicked, setOtherPicked] = useState(false);
  const mode = value.workOrderId ?? (onFileMatch && !otherPicked ? onFileMatch.id : otherPicked || value.boatLabel || value.customerName ? OTHER : "");

  return (
    <div className="space-y-2">
      <div>
        <label className={labelCls}>{label}</label>
        <select
          className={inputCls}
          value={mode}
          onChange={(e) => {
            const v = e.target.value;
            setOtherPicked(v === OTHER);
            if (v === "") onChange({ workOrderId: null, boatLabel: "", customerName: "" });
            else if (v === OTHER) onChange({ workOrderId: null, boatLabel: value.boatLabel, customerName: value.customerName });
            else if (v.startsWith("boat:")) {
              const b = onFile.find((x) => x.id === v);
              onChange({ workOrderId: null, boatLabel: b?.boatLabel ?? "", customerName: b?.customerName ?? "" });
            } else {
              const wo = workOrders.find((w) => w.id === v);
              onChange({ workOrderId: v, boatLabel: wo?.boatLabel ?? "", customerName: wo?.customerName ?? "" });
            }
          }}
        >
          <option value="">Shop stock (not for a specific boat)</option>
          {open.map((w) => (
            <option key={w.id} value={w.id}>
              {w.number} · {w.boatLabel || "No boat"} · {w.customerName || "No customer"}
            </option>
          ))}
          {onFile.length > 0 && (
            <optgroup label="Boats on file (no work order yet)">
              {onFile.map((b) => (
                <option key={b.id} value={b.id}>{b.boatLabel}{b.customerName ? ` · ${b.customerName}` : ""}</option>
              ))}
            </optgroup>
          )}
          <option value={OTHER}>Another boat (type it in)…</option>
        </select>
      </div>
      {mode === OTHER && (
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            placeholder="Boat (year make model · name / HIN)"
            value={value.boatLabel}
            onChange={(e) => onChange({ ...value, workOrderId: null, boatLabel: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Customer"
            value={value.customerName}
            onChange={(e) => onChange({ ...value, workOrderId: null, customerName: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
