import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BoatEquipment from "@/components/BoatEquipment";
import {
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Wrench,
  ArrowUpDown,
  Calendar,
  FileText,
  Clock,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";
import { getRecallsForEquipment, type RecallInfo } from "@/data/equipmentData";

// ---------------------------------------------------------------------------
// Types (mirrored from other modules to avoid import issues)
// ---------------------------------------------------------------------------

interface SavedBoat {
  id: string;
  make: string;
  model: string;
  year: string;
  name: string;
  engineType: string;
  engineMake: string;
  engineModel: string;
  engineCount: string;
  isPrimary?: boolean;
}

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

type ClaimStatus = "draft" | "submitted" | "approved" | "denied";

interface SavedClaim {
  id: string;
  equipmentId: string;
  status: ClaimStatus;
  submittedDate: string | null;
  notes: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLEET_STORAGE_KEY = "my_fleet";
const BOAT_STORAGE_KEY = "my_boat";
const CLAIMS_KEY = "bosun_warranty_claims";

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

type SortKey = "expiry" | "category" | "manufacturer";

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

function loadFleet(): SavedBoat[] {
  try {
    const stored = localStorage.getItem(FLEET_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    const legacy = localStorage.getItem(BOAT_STORAGE_KEY);
    if (legacy) {
      const boat: SavedBoat = {
        id: "boat-1",
        isPrimary: true,
        engineType: "",
        engineMake: "",
        engineModel: "",
        engineCount: "",
        ...JSON.parse(legacy),
      };
      return [boat];
    }
  } catch {
    // ignore
  }
  return [];
}

const DEFAULT_BOAT_ID = "boat-1773000691182";
const DEMO_EQUIPMENT: BoatEquipmentItem[] = [
  { id: "demo-equip-engine-1", boatId: DEFAULT_BOAT_ID, category: "engine", manufacturer: "Mercury", model: "Verado 250", serialNumber: "2B736428", purchaseDate: "2020-04-15", warrantyExpiry: "2027-04-15", dealer: "MarineMax Fort Lauderdale", notes: "Factory-installed. 7-year warranty.", createdAt: "2024-06-01T00:00:00.000Z" },
  { id: "demo-equip-mfd-1", boatId: DEFAULT_BOAT_ID, category: "mfd", manufacturer: "Simrad", model: "NSX 3012", serialNumber: "SIM-NSX-20491287", purchaseDate: "2023-08-20", warrantyExpiry: "2025-08-20", dealer: "West Marine Pompano Beach", notes: "12-inch touchscreen MFD. 2-year warranty.", createdAt: "2024-06-01T00:00:00.000Z" },
  { id: "demo-equip-charger-1", boatId: DEFAULT_BOAT_ID, category: "charger_inverter", manufacturer: "ProMariner", model: "ProTournament 360 Elite", serialNumber: "PM-360E-00847523", purchaseDate: "2022-03-10", warrantyExpiry: "2025-03-10", dealer: "Defender Industries", notes: "36-amp 3-bank charger. 3-year warranty.", createdAt: "2024-06-01T00:00:00.000Z" },
];

function loadEquipment(boatId: string): BoatEquipmentItem[] {
  try {
    const stored = localStorage.getItem(`bosun_boat_equipment_${boatId}`);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  if (boatId === DEFAULT_BOAT_ID) {
    localStorage.setItem(`bosun_boat_equipment_${boatId}`, JSON.stringify(DEMO_EQUIPMENT));
    return [...DEMO_EQUIPMENT];
  }
  return [];
}

function loadClaims(): SavedClaim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Warranty status helpers
// ---------------------------------------------------------------------------

function getWarrantyStatus(warrantyExpiry: string): "active" | "expiring" | "expired" {
  if (!warrantyExpiry) return "expired";
  const now = Date.now();
  const expiryTime = new Date(warrantyExpiry).getTime();
  if (expiryTime < now) return "expired";
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  if (expiryTime - now < ninetyDays) return "expiring";
  return "active";
}

function getDaysRemaining(warrantyExpiry: string): number {
  if (!warrantyExpiry) return -Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(warrantyExpiry);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Claim status styles
// ---------------------------------------------------------------------------

const CLAIM_STATUS_STYLES: Record<ClaimStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  submitted: { bg: "bg-blue-50", text: "text-blue-700", label: "Submitted" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Approved" },
  denied: { bg: "bg-red-50", text: "text-red-700", label: "Denied" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WarrantyTracker() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortKey>("expiry");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addBoatId, setAddBoatId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load all data (refreshKey forces re-read after adding equipment)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fleet = useMemo(() => loadFleet(), [refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const claims = useMemo(() => loadClaims(), [refreshKey]);

  const handleEquipmentAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setShowAddForm(false);
  }, []);

  // Build a flat list of all equipment with boat info attached
  const allEquipment = useMemo(() => {
    const items: (BoatEquipmentItem & { boatName: string })[] = [];
    for (const boat of fleet) {
      const equip = loadEquipment(boat.id);
      const boatLabel =
        boat.name || [boat.year, boat.make, boat.model].filter(Boolean).join(" ") || "Unnamed Boat";
      for (const e of equip) {
        items.push({ ...e, boatName: boatLabel });
      }
    }
    return items;
  }, [fleet]);

  // Summary counts
  const totalCount = allEquipment.length;
  const activeCount = allEquipment.filter((e) => getWarrantyStatus(e.warrantyExpiry) === "active").length;
  const expiringCount = allEquipment.filter((e) => getWarrantyStatus(e.warrantyExpiry) === "expiring").length;
  const expiredCount = allEquipment.filter((e) => getWarrantyStatus(e.warrantyExpiry) === "expired").length;

  // Sorted equipment grouped by boat
  const sortedByBoat = useMemo(() => {
    const grouped: Record<string, (BoatEquipmentItem & { boatName: string })[]> = {};
    for (const item of allEquipment) {
      const key = item.boatId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    // Sort within each group
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        if (sortBy === "expiry") {
          const da = a.warrantyExpiry ? new Date(a.warrantyExpiry).getTime() : 0;
          const db = b.warrantyExpiry ? new Date(b.warrantyExpiry).getTime() : 0;
          return da - db;
        }
        if (sortBy === "category") return a.category.localeCompare(b.category);
        return a.manufacturer.localeCompare(b.manufacturer);
      });
    }
    return grouped;
  }, [allEquipment, sortBy]);

  // Build equipment id -> name map for claims display
  const equipmentNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of allEquipment) {
      map[e.id] = `${e.manufacturer} ${e.model}`;
    }
    return map;
  }, [allEquipment]);

  // Recall status tracking
  const RECALL_STATUS_KEY = "bosun_recall_status";
  const [recallStatuses, setRecallStatuses] = useState<Record<string, { status: string; date: string }>>(() => {
    try { const raw = localStorage.getItem(RECALL_STATUS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });

  function handleRecallStatus(recallId: string, equipmentId: string, status: "open" | "resolved" | "not_applicable") {
    const all = { ...recallStatuses };
    const key = `${recallId}__${equipmentId}`;
    if (status === "open") {
      delete all[key];
    } else {
      all[key] = { status, date: new Date().toISOString() };
    }
    localStorage.setItem(RECALL_STATUS_KEY, JSON.stringify(all));
    setRecallStatuses(all);
  }

  // Recall scan across all registered equipment
  const allRecalls = useMemo(() => {
    const found: { recall: RecallInfo; equipment: BoatEquipmentItem & { boatName: string } }[] = [];
    for (const item of allEquipment) {
      const recalls = getRecallsForEquipment(item.manufacturer, item.model);
      for (const recall of recalls) {
        found.push({ recall, equipment: item });
      }
    }
    // Sort: safety first, then performance, then advisory
    const severityOrder: Record<string, number> = { safety: 0, performance: 1, advisory: 2 };
    found.sort((a, b) => (severityOrder[a.recall.severity] ?? 3) - (severityOrder[b.recall.severity] ?? 3));
    return found;
  }, [allEquipment]);

  const openRecallCount = allRecalls.filter(({ recall, equipment: eq }) => {
    const s = recallStatuses[`${recall.id}__${eq.id}`];
    return !s || s.status === "open";
  }).length;

  // Expiration timeline: upcoming 12 months
  const timeline = useMemo(() => {
    const now = new Date();
    const months: { label: string; items: (BoatEquipmentItem & { boatName: string })[] }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
      const monthStart = i === 0 ? now : monthDate;
      const label = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const items = allEquipment.filter((e) => {
        if (!e.warrantyExpiry) return false;
        const exp = new Date(e.warrantyExpiry);
        return exp >= monthStart && exp <= monthEnd;
      });
      if (items.length > 0) {
        months.push({ label, items });
      }
    }
    return months;
  }, [allEquipment]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Warranty Tracker</h1>
          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
              } else {
                const boats = loadFleet();
                setAddBoatId(boats[0]?.id ?? "");
                setShowAddForm(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {showAddForm ? "Cancel" : "+ Add Equipment"}
          </button>
        </div>

        {/* Add equipment form */}
        {showAddForm && (
          <div className="border border-border rounded-lg p-4 mb-6">
            {fleet.length > 1 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-foreground mb-1">Select Boat</label>
                <select
                  value={addBoatId}
                  onChange={(e) => setAddBoatId(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                >
                  {fleet.map((boat) => (
                    <option key={boat.id} value={boat.id}>
                      {boat.name || [boat.year, boat.make, boat.model].filter(Boolean).join(" ") || "Unnamed Boat"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {addBoatId && (
              <BoatEquipment
                boatId={addBoatId}
                boatInfo={(() => {
                  const b = fleet.find((f) => f.id === addBoatId);
                  return b ? { name: b.name, make: b.make, model: b.model, year: b.year } : undefined;
                })()}
                engineInfo={(() => {
                  const b = fleet.find((f) => f.id === addBoatId);
                  return b ? { engineMake: b.engineMake, engineModel: b.engineModel, engineType: b.engineType, engineCount: b.engineCount } : undefined;
                })()}
              />
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleEquipmentAdded}
                className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
              >
                Done — Refresh List
              </button>
            </div>
          </div>
        )}

        {/* ──────────── Summary cards ──────────── */}
        <div className={`grid grid-cols-2 ${openRecallCount > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3 mb-8`}>
          <div className="border border-border rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Equipment</p>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          </div>
          <div className="border border-green-200 bg-green-50/50 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <p className="text-xs font-medium text-green-700">Active</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          </div>
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs font-medium text-amber-700">Expiring Soon</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{expiringCount}</p>
          </div>
          <div className="border border-red-200 bg-red-50/50 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <p className="text-xs font-medium text-red-700">Expired</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
          </div>
          {openRecallCount > 0 && (
            <div className="border border-red-300 bg-red-50/50 rounded-lg p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                <p className="text-xs font-medium text-red-700">Open Recalls</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{openRecallCount}</p>
            </div>
          )}
        </div>

        {/* ──────────── Recall Alerts ──────────── */}
        {allRecalls.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              Recall Alerts
              {openRecallCount > 0 && (
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {openRecallCount} open
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {allRecalls.map(({ recall, equipment: eq }) => {
                const key = `${recall.id}__${eq.id}`;
                const rStatus = recallStatuses[key];
                const isDismissed = rStatus?.status === "resolved" || rStatus?.status === "not_applicable";

                return (
                  <div
                    key={`${recall.id}-${eq.id}`}
                    className={`rounded-lg p-4 border ${
                      isDismissed
                        ? "bg-gray-50 border-gray-200 opacity-70"
                        : recall.severity === "safety"
                        ? "bg-red-50 border-red-200"
                        : recall.severity === "performance"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertOctagon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isDismissed ? "text-gray-400" : recall.severity === "safety" ? "text-red-600" : recall.severity === "performance" ? "text-orange-600" : "text-blue-600"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-sm font-semibold ${isDismissed ? "line-through text-muted-foreground" : "text-foreground"}`}>{recall.title}</span>
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
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Affects: <span className="font-medium text-foreground">{eq.manufacturer} {eq.model}</span>
                          {" "}on <span className="font-medium text-foreground">{eq.boatName}</span>
                          {" "}(S/N: {eq.serialNumber})
                        </p>
                        {!isDismissed && (
                          <>
                            <p className="text-xs text-muted-foreground mb-1.5">{recall.description}</p>
                            <p className="text-xs font-medium text-foreground mb-2">
                              Action Required: {recall.actionRequired}
                            </p>
                          </>
                        )}
                        {isDismissed && rStatus?.date && (
                          <p className="text-[11px] text-muted-foreground mb-1.5">
                            Marked {rStatus.status === "resolved" ? "resolved" : "N/A"} on {new Date(rStatus.date).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span>Issued: {new Date(recall.issueDate).toLocaleDateString()}</span>
                          <span>ID: {recall.id}</span>
                          {recall.moreInfoUrl && (
                            <a
                              href={recall.moreInfoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary font-semibold hover:underline flex items-center gap-0.5"
                            >
                              More Info <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {/* Status action buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                          {(!rStatus || rStatus.status === "open") ? (
                            <>
                              <button
                                onClick={() => handleRecallStatus(recall.id, eq.id, "resolved")}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Mark as Resolved
                              </button>
                              <button
                                onClick={() => handleRecallStatus(recall.id, eq.id, "not_applicable")}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors"
                              >
                                N/A — Doesn't Apply
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRecallStatus(recall.id, eq.id, "open")}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors"
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
          </section>
        )}

        {/* ──────────── Equipment by boat ──────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Equipment</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="border border-border rounded px-2 py-1 text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="expiry">Expiry Date</option>
                <option value="category">Category</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>
          </div>

          {totalCount === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No equipment registered yet. Add equipment to your boats in{" "}
                <button onClick={() => navigate("/my-boats")} className="text-primary font-semibold hover:underline">
                  My Boats
                </button>
                .
              </p>
            </div>
          ) : (
            Object.entries(sortedByBoat).map(([boatId, items]) => {
              const boatName = items[0]?.boatName ?? "Unknown Boat";
              return (
                <div key={boatId} className="mb-6">
                  {Object.keys(sortedByBoat).length > 1 && (
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </span>
                      {boatName}
                    </h3>
                  )}
                  <div className="space-y-2">
                    {items.map((item) => {
                      const status = getWarrantyStatus(item.warrantyExpiry);
                      const days = getDaysRemaining(item.warrantyExpiry);
                      const IconComponent = CATEGORY_ICONS[item.category] || Wrench;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground truncate">
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
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              S/N: {item.serialNumber}
                              {item.warrantyExpiry && (
                                <>
                                  {" "}· Expires {new Date(item.warrantyExpiry).toLocaleDateString()}
                                  {" "}·{" "}
                                  {days > 0 ? (
                                    <span className={days <= 90 ? "text-amber-600 font-medium" : ""}>
                                      {days} day{days !== 1 ? "s" : ""} remaining
                                    </span>
                                  ) : days === 0 ? (
                                    <span className="text-amber-600 font-medium">Expires today</span>
                                  ) : (
                                    <span className="text-red-500 font-medium">
                                      Expired {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} ago
                                    </span>
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* ──────────── Claims section ──────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Warranty Claims
          </h2>

          {claims.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No warranty claims filed yet. You can file claims from the equipment section on your boat page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {claims.map((claim) => {
                const style = CLAIM_STATUS_STYLES[claim.status];
                const equipName = equipmentNames[claim.equipmentId] || "Unknown Equipment";
                return (
                  <div
                    key={claim.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{equipName}</p>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {claim.submittedDate
                          ? `Submitted ${new Date(claim.submittedDate).toLocaleDateString()}`
                          : "Not yet submitted"}
                        {claim.notes && ` · ${claim.notes.substring(0, 60)}${claim.notes.length > 60 ? "..." : ""}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ──────────── Expiration timeline ──────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Expiration Timeline
          </h2>

          {timeline.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming warranty expirations in the next 12 months.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border space-y-6">
              {timeline.map((month) => (
                <div key={month.label} className="relative">
                  {/* Dot on timeline */}
                  <div className="absolute -left-[calc(1.5rem+5px)] w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" />
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {month.label}
                  </h3>
                  <div className="space-y-1.5">
                    {month.items.map((item) => {
                      const status = getWarrantyStatus(item.warrantyExpiry);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-muted/50"
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              status === "expiring" ? "bg-amber-500" : "bg-green-500"
                            }`}
                          />
                          <span className="text-foreground font-medium truncate">
                            {item.manufacturer} {item.model}
                          </span>
                          <span className="text-muted-foreground text-xs flex-shrink-0">
                            {new Date(item.warrantyExpiry).toLocaleDateString()}
                          </span>
                          {Object.keys(sortedByBoat).length > 1 && (
                            <span className="text-muted-foreground text-[10px] flex-shrink-0">
                              ({item.boatName})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
