import { useState } from "react";
import type { WorkOrder } from "@shared/shop";
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
  label = "Ordered for",
}: {
  value: BoatTarget;
  onChange: (v: BoatTarget) => void;
  workOrders: WorkOrder[];
  label?: string;
}) {
  const open = workOrders.filter((w) => w.status !== "invoiced" || w.id === value.workOrderId);
  // "Another boat" stays selected while its fields are still empty.
  const [otherPicked, setOtherPicked] = useState(false);
  const mode = value.workOrderId ?? (otherPicked || value.boatLabel || value.customerName ? OTHER : "");

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
            else {
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
          <option value={OTHER}>Another boat (no work order yet)…</option>
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
