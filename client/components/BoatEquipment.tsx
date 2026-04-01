import { useState, useEffect } from "react";
import {
  Wrench,
  Trash2,
  Edit,
  Shield,
  AlertTriangle,
  FileText,
} from "lucide-react";
import WarrantyClaimForm from "./WarrantyClaimForm";

interface BoatEquipmentItem {
  id: string;
  boatId: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  dealer: string;
  notes: string;
  createdAt: string;
}

const EQUIPMENT_CATEGORIES: Record<string, string> = {
  engine: "Engine",
  mfd: "MFD",
  radar: "Radar",
  fishfinder: "Fishfinder",
  vhf_radio: "VHF Radio",
  autopilot: "Autopilot",
  trolling_motor: "Trolling Motor",
  generator: "Generator",
  air_conditioning: "Air Conditioning",
  windlass: "Windlass",
  thruster: "Thruster",
  watermaker: "Watermaker",
  refrigeration: "Refrigeration",
  stereo: "Stereo",
  lighting: "Lighting",
  battery: "Battery",
  charger_inverter: "Charger/Inverter",
  other: "Other",
};

const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  engine: Wrench,
  mfd: Shield,
  radar: Shield,
  fishfinder: Shield,
  vhf_radio: Shield,
  autopilot: Shield,
  trolling_motor: Wrench,
  generator: Wrench,
  air_conditioning: Wrench,
  windlass: Wrench,
  thruster: Wrench,
  watermaker: Wrench,
  refrigeration: Wrench,
  stereo: Shield,
  lighting: Shield,
  battery: Wrench,
  charger_inverter: Wrench,
  other: Wrench,
};

const EMPTY_FORM = {
  category: "engine",
  manufacturer: "",
  model: "",
  serialNumber: "",
  purchaseDate: "",
  warrantyExpiry: "",
  dealer: "",
  notes: "",
};

function getStorageKey(boatId: string) {
  return `bosun_boat_equipment_${boatId}`;
}

function loadEquipment(boatId: string): BoatEquipmentItem[] {
  try {
    const stored = localStorage.getItem(getStorageKey(boatId));
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveEquipment(boatId: string, items: BoatEquipmentItem[]) {
  localStorage.setItem(getStorageKey(boatId), JSON.stringify(items));
}

function getWarrantyStatus(warrantyExpiry: string): "active" | "expiring" | "expired" {
  if (!warrantyExpiry) return "expired";
  const now = Date.now();
  const expiryTime = new Date(warrantyExpiry).getTime();
  if (expiryTime < now) return "expired";
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  if (expiryTime - now < ninetyDays) return "expiring";
  return "active";
}

interface BoatEquipmentProps {
  boatId: string;
  boatInfo?: { name: string; make: string; model: string; year: string };
}

export default function BoatEquipment({ boatId, boatInfo }: BoatEquipmentProps) {
  const [equipment, setEquipment] = useState<BoatEquipmentItem[]>(() => loadEquipment(boatId));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [claimItemId, setClaimItemId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    setEquipment(loadEquipment(boatId));
  }, [boatId]);

  function persist(items: BoatEquipmentItem[]) {
    setEquipment(items);
    saveEquipment(boatId, items);
  }

  function handleSubmit() {
    if (!form.manufacturer || !form.model || !form.serialNumber) return;

    if (editingId) {
      const updated = equipment.map((item) =>
        item.id === editingId
          ? { ...item, ...form }
          : item
      );
      persist(updated);
      setEditingId(null);
    } else {
      const newItem: BoatEquipmentItem = {
        id: `equip-${Date.now()}`,
        boatId,
        ...form,
        createdAt: new Date().toISOString(),
      };
      persist([...equipment, newItem]);
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleEdit(item: BoatEquipmentItem) {
    setForm({
      category: item.category,
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      purchaseDate: item.purchaseDate,
      warrantyExpiry: item.warrantyExpiry,
      dealer: item.dealer,
      notes: item.notes,
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    persist(equipment.filter((item) => item.id !== id));
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment</h4>
        <button
          onClick={() => {
            if (showForm) {
              handleCancel();
            } else {
              setShowForm(true);
            }
          }}
          className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="border border-dashed border-primary/30 rounded-lg p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs"
              >
                {Object.entries(EQUIPMENT_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Manufacturer</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                placeholder="e.g. Yamaha, Garmin"
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. F300, GPSMAP 8616"
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Serial Number</label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder="e.g. YAM-12345678"
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Warranty Expiration</label>
              <input
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                className="w-full border border-border rounded-md px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Dealer / Place Purchased <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.dealer}
              onChange={(e) => setForm({ ...form, dealer: e.target.value })}
              placeholder="e.g. MarineMax Tampa"
              className="w-full border border-border rounded-md px-2 py-1.5 text-xs placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional details about this equipment..."
              rows={2}
              className="w-full border border-border rounded-md px-2 py-1.5 text-xs placeholder:text-muted-foreground resize-none"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!form.manufacturer || !form.model || !form.serialNumber}
            className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {editingId ? "Update Equipment" : "Add Equipment"}
          </button>
        </div>
      )}

      {/* Equipment list */}
      {equipment.length > 0 ? (
        <div className="space-y-2">
          {equipment.map((item) => {
            const status = getWarrantyStatus(item.warrantyExpiry);
            const IconComponent = CATEGORY_ICONS[item.category] || Wrench;

            return (
              <div key={item.id}>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">
                        {item.manufacturer} {item.model}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        {EQUIPMENT_CATEGORIES[item.category] || item.category}
                      </span>
                      {status === "active" && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                          Active
                        </span>
                      )}
                      {status === "expiring" && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Expiring Soon
                        </span>
                      )}
                      {status === "expired" && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      S/N: {item.serialNumber}
                      {item.warrantyExpiry && ` · Warranty expires ${new Date(item.warrantyExpiry).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setClaimItemId(claimItemId === item.id ? null : item.id)}
                      className="text-xs text-blue-600 hover:opacity-70 transition-opacity"
                      title="File Warranty Claim"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-xs text-primary hover:opacity-70 transition-opacity"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500 hover:opacity-70 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {claimItemId === item.id && (
                  <div className="mt-2 mb-2 border border-border rounded-lg p-3">
                    <WarrantyClaimForm
                      equipment={{
                        id: item.id,
                        category: EQUIPMENT_CATEGORIES[item.category] || item.category,
                        manufacturer: item.manufacturer,
                        model: item.model,
                        serialNumber: item.serialNumber,
                        purchaseDate: item.purchaseDate,
                        warrantyExpiry: item.warrantyExpiry,
                        dealer: item.dealer,
                        notes: item.notes,
                      }}
                      boat={boatInfo || { name: "", make: "", model: "", year: "" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !showForm && (
          <p className="text-xs text-muted-foreground py-1">No equipment registered. Add engines, electronics, and other warrantable gear.</p>
        )
      )}
    </div>
  );
}
