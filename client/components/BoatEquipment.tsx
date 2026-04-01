import { useState, useEffect, useRef } from "react";
import {
  Wrench,
  Trash2,
  Edit,
  Shield,
  AlertTriangle,
  FileText,
  BookOpen,
  ExternalLink,
  Upload,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import WarrantyClaimForm from "./WarrantyClaimForm";
import { getSupportPortal, getRecallsForEquipment } from "@/data/equipmentData";

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
  manualUrl?: string;    // data URL or external URL for uploaded service manual
  manualName?: string;   // original filename of uploaded manual
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

// Demo equipment for the default boat — seeds on first load
const DEFAULT_BOAT_ID = "boat-1773000691182";
const DEMO_EQUIPMENT: BoatEquipmentItem[] = [
  {
    id: "demo-equip-engine-1",
    boatId: DEFAULT_BOAT_ID,
    category: "engine",
    manufacturer: "Mercury",
    model: "Verado 250",
    serialNumber: "2B736428",
    purchaseDate: "2020-04-15",
    warrantyExpiry: "2027-04-15",
    dealer: "MarineMax Fort Lauderdale",
    notes: "Factory-installed. 7-year warranty from Mercury.",
    createdAt: "2024-06-01T00:00:00.000Z",
  },
  {
    id: "demo-equip-mfd-1",
    boatId: DEFAULT_BOAT_ID,
    category: "mfd",
    manufacturer: "Simrad",
    model: "NSX 3012",
    serialNumber: "SIM-NSX-20491287",
    purchaseDate: "2023-08-20",
    warrantyExpiry: "2025-08-20",
    dealer: "West Marine Pompano Beach",
    notes: "12-inch touchscreen MFD. 2-year factory warranty.",
    createdAt: "2024-06-01T00:00:00.000Z",
  },
  {
    id: "demo-equip-charger-1",
    boatId: DEFAULT_BOAT_ID,
    category: "charger_inverter",
    manufacturer: "ProMariner",
    model: "ProTournament 360 Elite",
    serialNumber: "PM-360E-00847523",
    purchaseDate: "2022-03-10",
    warrantyExpiry: "2025-03-10",
    dealer: "Defender Industries",
    notes: "36-amp 3-bank onboard charger. 3-year warranty.",
    createdAt: "2024-06-01T00:00:00.000Z",
  },
];

function loadEquipment(boatId: string): BoatEquipmentItem[] {
  try {
    const stored = localStorage.getItem(getStorageKey(boatId));
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  // Seed demo equipment for default boat on first load
  if (boatId === DEFAULT_BOAT_ID) {
    saveEquipment(boatId, DEMO_EQUIPMENT);
    return [...DEMO_EQUIPMENT];
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

// Recall dismissal tracking
type RecallStatus = "open" | "resolved" | "not_applicable";
interface RecallDismissal {
  status: RecallStatus;
  date: string;
  note?: string;
}
const RECALL_STATUS_KEY = "bosun_recall_status";

function loadRecallStatuses(): Record<string, RecallDismissal> {
  try {
    const raw = localStorage.getItem(RECALL_STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveRecallStatus(recallId: string, equipmentId: string, status: RecallStatus, note?: string) {
  const all = loadRecallStatuses();
  const key = `${recallId}__${equipmentId}`;
  if (status === "open") {
    delete all[key];
  } else {
    all[key] = { status, date: new Date().toISOString(), note };
  }
  localStorage.setItem(RECALL_STATUS_KEY, JSON.stringify(all));
  return all;
}

function getRecallStatus(recallId: string, equipmentId: string): RecallDismissal | null {
  const all = loadRecallStatuses();
  return all[`${recallId}__${equipmentId}`] ?? null;
}

interface BoatEquipmentProps {
  boatId: string;
  boatInfo?: { name: string; make: string; model: string; year: string };
  engineInfo?: { engineMake: string; engineModel: string; engineType: string; engineCount: string };
}

export default function BoatEquipment({ boatId, boatInfo, engineInfo }: BoatEquipmentProps) {
  const [equipment, setEquipment] = useState<BoatEquipmentItem[]>(() => loadEquipment(boatId));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [claimItemId, setClaimItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualDataUrl, setManualDataUrl] = useState<string | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [recallStatuses, setRecallStatuses] = useState<Record<string, RecallDismissal>>(() => loadRecallStatuses());

  function handleRecallStatus(recallId: string, equipmentId: string, status: RecallStatus) {
    const updated = saveRecallStatus(recallId, equipmentId, status);
    setRecallStatuses({ ...updated });
  }

  // Check if the user's engine is already registered
  const engineAlreadyRegistered = engineInfo?.engineMake
    ? equipment.some(
        (e) => e.category === "engine" && e.manufacturer.toLowerCase() === engineInfo.engineMake.toLowerCase()
      )
    : true; // no engine info = don't show prompt

  useEffect(() => {
    setEquipment(loadEquipment(boatId));
  }, [boatId]);

  function persist(items: BoatEquipmentItem[]) {
    setEquipment(items);
    saveEquipment(boatId, items);
  }

  function handleManualUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum size is 10 MB.");
      return;
    }
    setManualFile(file);
    const reader = new FileReader();
    reader.onload = () => setManualDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleSubmit() {
    if (!form.manufacturer || !form.model || !form.serialNumber) return;

    const manualFields: Partial<BoatEquipmentItem> = {};
    if (manualDataUrl && manualFile) {
      manualFields.manualUrl = manualDataUrl;
      manualFields.manualName = manualFile.name;
    }

    if (editingId) {
      const updated = equipment.map((item) =>
        item.id === editingId
          ? { ...item, ...form, ...manualFields }
          : item
      );
      persist(updated);
      setEditingId(null);
    } else {
      const newItem: BoatEquipmentItem = {
        id: `equip-${Date.now()}`,
        boatId,
        ...form,
        ...manualFields,
        createdAt: new Date().toISOString(),
      };
      persist([...equipment, newItem]);
    }

    setForm(EMPTY_FORM);
    setManualFile(null);
    setManualDataUrl(null);
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
    setManualFile(null);
    setManualDataUrl(null);
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
          {/* Service Manual Upload */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Service Manual <span className="text-muted-foreground font-normal">(optional — PDF)</span>
            </label>
            {manualFile ? (
              <div className="flex items-center gap-2 px-2 py-1.5 border border-border rounded-md bg-gray-50">
                <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{manualFile.name}</span>
                <button
                  onClick={() => { setManualFile(null); setManualDataUrl(null); }}
                  className="text-xs text-red-500 hover:opacity-70 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (editingId && equipment.find((e) => e.id === editingId)?.manualUrl) ? (
              <div className="flex items-center gap-2 px-2 py-1.5 border border-border rounded-md bg-gray-50">
                <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">
                  {equipment.find((e) => e.id === editingId)?.manualName || "Service Manual"}
                </span>
                <span className="text-[10px] text-muted-foreground">Already uploaded</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => manualInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 border border-dashed border-border rounded-md text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload PDF Manual
              </button>
            )}
            <input
              ref={manualInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleManualUpload}
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

      {/* Engine pre-fill prompt */}
      {!engineAlreadyRegistered && !showForm && engineInfo?.engineMake && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">
            Register your {engineInfo.engineMake} {engineInfo.engineModel?.replace(/\s*\([\d–\-]+.*?\)$/, "")}?
          </p>
          <p className="text-[10px] text-blue-600 mb-2">
            We already have your engine details from your boat profile. Just add the serial number{engineInfo.engineCount && engineInfo.engineCount !== "Single" ? "s" : ""} and warranty info.
          </p>
          <button
            onClick={() => {
              setForm({
                ...EMPTY_FORM,
                category: "engine",
                manufacturer: engineInfo.engineMake,
                model: engineInfo.engineModel?.replace(/\s*\([\d–\-]+.*?\)$/, "") || "",
              });
              setShowForm(true);
            }}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Serial Number{engineInfo.engineCount && engineInfo.engineCount !== "Single" ? "s" : ""} & Warranty Info
          </button>
        </div>
      )}

      {/* Equipment list */}
      {equipment.length > 0 ? (
        <div className="space-y-2">
          {equipment.map((item) => {
            const status = getWarrantyStatus(item.warrantyExpiry);
            const IconComponent = CATEGORY_ICONS[item.category] || Wrench;
            const allItemRecalls = getRecallsForEquipment(item.manufacturer, item.model);
            const recalls = allItemRecalls; // keep full list for expanded view
            const openRecalls = allItemRecalls.filter((r) => {
              const s = recallStatuses[`${r.id}__${item.id}`];
              return !s || s.status === "open";
            });
            const support = getSupportPortal(item.manufacturer);
            const isExpanded = expandedItemId === item.id;

            return (
              <div key={item.id}>
                <div
                  className={`rounded-lg border hover:bg-gray-50 transition-colors ${openRecalls.some((r) => r.severity === "safety") ? "border-red-300 bg-red-50/30" : "border-border"}`}
                >
                  <div className="flex items-center gap-3 p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {openRecalls.length > 0 && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5 ${
                            openRecalls.some((r) => r.severity === "safety")
                              ? "text-red-700 bg-red-100"
                              : "text-orange-700 bg-orange-100"
                          }`}>
                            <AlertOctagon className="w-2.5 h-2.5" />
                            {openRecalls.length} Recall{openRecalls.length > 1 ? "s" : ""}
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
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Details & Resources"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
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

                  {/* Expanded details: manuals, support, recalls */}
                  {isExpanded && (
                    <div className="border-t border-border px-3 py-3 space-y-3">
                      {/* Recall Alerts */}
                      {recalls.length > 0 && (
                        <div className="space-y-2">
                          {recalls.map((recall) => {
                            const rStatus = getRecallStatus(recall.id, item.id);
                            const isDismissed = rStatus?.status === "resolved" || rStatus?.status === "not_applicable";

                            return (
                              <div
                                key={recall.id}
                                className={`rounded-md p-2.5 text-xs ${
                                  isDismissed
                                    ? "bg-gray-50 border border-gray-200 opacity-70"
                                    : recall.severity === "safety"
                                    ? "bg-red-50 border border-red-200"
                                    : recall.severity === "performance"
                                    ? "bg-orange-50 border border-orange-200"
                                    : "bg-blue-50 border border-blue-200"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <AlertOctagon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                                    isDismissed ? "text-gray-400" : recall.severity === "safety" ? "text-red-600" : recall.severity === "performance" ? "text-orange-600" : "text-blue-600"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <span className={`font-semibold ${isDismissed ? "line-through text-muted-foreground" : ""}`}>{recall.title}</span>
                                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        isDismissed
                                          ? "bg-gray-200 text-gray-600"
                                          : recall.severity === "safety"
                                          ? "bg-red-200 text-red-800"
                                          : recall.severity === "performance"
                                          ? "bg-orange-200 text-orange-800"
                                          : "bg-blue-200 text-blue-800"
                                      }`}>
                                        {recall.severity}
                                      </span>
                                      {rStatus?.status === "resolved" && (
                                        <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                          Resolved
                                        </span>
                                      )}
                                      {rStatus?.status === "not_applicable" && (
                                        <span className="text-[10px] font-semibold text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                                          N/A
                                        </span>
                                      )}
                                    </div>
                                    {!isDismissed && (
                                      <>
                                        <p className="text-muted-foreground mb-1">{recall.description}</p>
                                        <p className="font-medium mb-1">Action: {recall.actionRequired}</p>
                                      </>
                                    )}
                                    {isDismissed && rStatus?.date && (
                                      <p className="text-[10px] text-muted-foreground mb-1">
                                        Marked {rStatus.status === "resolved" ? "resolved" : "N/A"} on {new Date(rStatus.date).toLocaleDateString()}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                      <span>Issued: {new Date(recall.issueDate).toLocaleDateString()}</span>
                                      <span>ID: {recall.id}</span>
                                      {recall.moreInfoUrl && (
                                        <a
                                          href={recall.moreInfoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary font-semibold hover:underline flex items-center gap-0.5"
                                        >
                                          More Info <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                    {/* Status action buttons */}
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                      {(!rStatus || rStatus.status === "open") ? (
                                        <>
                                          <button
                                            onClick={() => handleRecallStatus(recall.id, item.id, "resolved")}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-600 text-white text-[10px] font-semibold hover:bg-green-700 transition-colors"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Mark as Resolved
                                          </button>
                                          <button
                                            onClick={() => handleRecallStatus(recall.id, item.id, "not_applicable")}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 text-[10px] font-semibold hover:bg-gray-300 transition-colors"
                                          >
                                            N/A — Doesn't Apply
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleRecallStatus(recall.id, item.id, "open")}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 text-[10px] font-semibold hover:bg-gray-300 transition-colors"
                                        >
                                          Reopen
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Service Manual */}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Service Manual</p>
                        {item.manualUrl ? (
                          <a
                            href={item.manualUrl}
                            download={item.manualName || "service-manual.pdf"}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary font-medium hover:bg-primary/10 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="truncate">{item.manualName || "Service Manual"}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">Download</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload a service manual PDF
                          </button>
                        )}
                      </div>

                      {/* Manufacturer Resources */}
                      {support && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            {item.manufacturer} Resources
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <a
                              href={support.manualsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-gray-50 border border-border text-xs text-foreground hover:bg-gray-100 transition-colors"
                            >
                              <BookOpen className="w-3 h-3 text-primary" />
                              <span className="truncate">Manuals & Docs</span>
                              <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-auto flex-shrink-0" />
                            </a>
                            {support.partsUrl && (
                              <a
                                href={support.partsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-gray-50 border border-border text-xs text-foreground hover:bg-gray-100 transition-colors"
                              >
                                <Wrench className="w-3 h-3 text-primary" />
                                <span className="truncate">Parts Lookup</span>
                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-auto flex-shrink-0" />
                              </a>
                            )}
                            {support.techSupportUrl && (
                              <a
                                href={support.techSupportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-gray-50 border border-border text-xs text-foreground hover:bg-gray-100 transition-colors"
                              >
                                <Shield className="w-3 h-3 text-primary" />
                                <span className="truncate">Tech Support</span>
                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-auto flex-shrink-0" />
                              </a>
                            )}
                            {support.videosUrl && (
                              <a
                                href={support.videosUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-gray-50 border border-border text-xs text-foreground hover:bg-gray-100 transition-colors"
                              >
                                <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">Videos</span>
                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-auto flex-shrink-0" />
                              </a>
                            )}
                          </div>
                          {support.notes && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{support.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
