import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { BOAT_MAKES, BOAT_MODELS, type BoatMake } from "@/data/boatData";
import { ENGINE_DATA, ENGINE_TYPES, OUTBOARD_COUNTS, type EngineType } from "@/data/engineData";
import BoatDocuments from "@/components/BoatDocuments";
import BoatEquipment from "@/components/BoatEquipment";

const FLEET_STORAGE_KEY = "my_fleet";
const BOAT_STORAGE_KEY = "my_boat"; // keep for backwards compat with HeroSection

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
  storageType?: string;
  locationName?: string;
  locationAddress?: string;
}

const EMPTY_BOAT: Omit<SavedBoat, "id"> = {
  make: "", model: "", year: "", name: "",
  engineType: "", engineMake: "", engineModel: "", engineCount: "",
  storageType: "", locationName: "", locationAddress: "",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => String(CURRENT_YEAR - i));

const STORAGE_TYPES = ["Marina Slip", "Mooring", "Trailer", "Dry Storage", "Boatyard"];

const DEFAULT_DEMO_BOAT: SavedBoat = {
  id: "boat-1773000691182",
  make: "Sea Ray",
  model: "SDX 250 OB",
  year: "2020",
  name: "No Vacancy",
  engineType: "Outboard",
  engineMake: "Mercury",
  engineModel: "Verado 250 (2021–present)",
  engineCount: "Single",
  isPrimary: true,
  storageType: "Marina Slip",
  locationName: "Rickenbacker Marina",
  locationAddress: "3301 Rickenbacker Cswy, Key Biscayne, FL 33149",
};

function loadFleet(): SavedBoat[] {
  try {
    const stored = localStorage.getItem(FLEET_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    // Migrate legacy single-boat storage
    const legacy = localStorage.getItem(BOAT_STORAGE_KEY);
    if (legacy) {
      const boat = { id: "boat-1", isPrimary: true, engineType: "", engineMake: "", engineModel: "", engineCount: "", ...JSON.parse(legacy) };
      return [boat];
    }
  } catch {}
  // Seed demo boat for first-time visitors
  const fleet = [DEFAULT_DEMO_BOAT];
  saveFleet(fleet);
  return fleet;
}

function saveFleet(fleet: SavedBoat[]) {
  localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet));
  // Keep legacy key in sync with primary boat
  const primary = fleet.find((b) => b.isPrimary) ?? fleet[0];
  if (primary) localStorage.setItem(BOAT_STORAGE_KEY, JSON.stringify(primary));
  else localStorage.removeItem(BOAT_STORAGE_KEY);
}

function BoatForm({
  boat,
  onSave,
  onCancel,
}: {
  boat: SavedBoat;
  onSave: (b: SavedBoat) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SavedBoat>(boat);

  const boatModels = form.make ? (BOAT_MODELS[form.make as BoatMake] ?? []) : [];
  const engineMakes = form.engineType ? Object.keys(ENGINE_DATA[form.engineType as EngineType]) : [];
  const engineModels =
    form.engineType && form.engineMake
      ? ENGINE_DATA[form.engineType as EngineType][form.engineMake] ?? []
      : [];

  const sel = "w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50";
  const selDis = `${sel} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="space-y-5">
      {/* Boat Details */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Boat Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Make</label>
            <select value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value, model: "" })} className={sel}>
              <option value="">Select a make…</option>
              {BOAT_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Model</label>
            <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} disabled={!form.make} className={selDis}>
              <option value="">{form.make ? "Select a model…" : "Select a make first…"}</option>
              {boatModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Year</label>
            <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={sel}>
              <option value="">Select a year…</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Boat Name <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Serenity, Lady Luck, The Knot"
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Engine Details */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Engine Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Engine Type</label>
            <select value={form.engineType} onChange={(e) => setForm({ ...form, engineType: e.target.value, engineMake: "", engineModel: "", engineCount: "" })} className={sel}>
              <option value="">Select engine type…</option>
              {ENGINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {form.engineType === "Outboard" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Number of Engines</label>
              <select value={form.engineCount} onChange={(e) => setForm({ ...form, engineCount: e.target.value })} className={sel}>
                <option value="">Select count…</option>
                {OUTBOARD_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Engine Make</label>
            <select value={form.engineMake} onChange={(e) => setForm({ ...form, engineMake: e.target.value, engineModel: "" })} disabled={!form.engineType} className={selDis}>
              <option value="">{form.engineType ? "Select a make…" : "Select engine type first…"}</option>
              {engineMakes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Engine Model</label>
            <select value={form.engineModel} onChange={(e) => setForm({ ...form, engineModel: e.target.value })} disabled={!form.engineMake} className={selDis}>
              <option value="">{form.engineMake ? "Select a model…" : "Select a make first…"}</option>
              {engineModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Storage & Location */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Storage & Location</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Storage Type</label>
            <select value={form.storageType} onChange={(e) => setForm({ ...form, storageType: e.target.value })} className={sel}>
              <option value="">Select storage type…</option>
              {STORAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Marina / Storage Facility <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.locationName}
              onChange={(e) => setForm({ ...form, locationName: e.target.value })}
              placeholder="e.g. Rickenbacker Marina, Slip D-42"
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Address <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.locationAddress}
              onChange={(e) => setForm({ ...form, locationAddress: e.target.value })}
              placeholder="e.g. 3301 Rickenbacker Cswy, Key Biscayne, FL 33149"
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Save Boat
        </button>
      </div>
    </div>
  );
}

export default function MyBoats() {
  const navigate = useNavigate();
  const [fleet, setFleet] = useState<SavedBoat[]>(loadFleet);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  function updateFleet(newFleet: SavedBoat[]) {
    setFleet(newFleet);
    saveFleet(newFleet);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  function handleSaveBoat(updated: SavedBoat) {
    const newFleet = fleet.map((b) => b.id === updated.id ? updated : b);
    updateFleet(newFleet);
    setEditingId(null);
  }

  function handleAddBoat(newBoat: SavedBoat) {
    const newFleet = [...fleet, newBoat];
    // If first boat, make it primary
    if (newFleet.length === 1) newFleet[0].isPrimary = true;
    updateFleet(newFleet);
    setAddingNew(false);
  }

  function handleSetPrimary(id: string) {
    const newFleet = fleet.map((b) => ({ ...b, isPrimary: b.id === id }));
    updateFleet(newFleet);
  }

  function handleDelete(id: string) {
    const newFleet = fleet.filter((b) => b.id !== id);
    // If we deleted the primary, promote first remaining
    if (!newFleet.some((b) => b.isPrimary) && newFleet.length > 0) {
      newFleet[0].isPrimary = true;
    }
    updateFleet(newFleet);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-foreground">My Boats</h1>
          {savedMsg && (
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-full">
              Saved!
            </span>
          )}
        </div>

        {/* Fleet list */}
        <div className="space-y-4">
          {fleet.map((boat) => (
            <div key={boat.id} className={`border rounded-lg overflow-hidden ${boat.isPrimary ? "border-primary" : "border-border"}`}>
              {/* Boat header */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {boat.name || [boat.year, boat.make, boat.model].filter(Boolean).join(" ") || "Unnamed Boat"}
                      </p>
                      {boat.isPrimary && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                          Primary
                        </span>
                      )}
                    </div>
                    {boat.name && (boat.make || boat.year) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[boat.year, boat.make, boat.model].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {boat.engineMake && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[boat.engineCount, boat.engineMake, boat.engineModel?.replace(/\s*\([\d–\-]+.*?\)$/, "")].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {(boat.storageType || boat.locationName) && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {[boat.storageType, boat.locationName].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!boat.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(boat.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(editingId === boat.id ? null : boat.id)}
                    className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
                  >
                    {editingId === boat.id ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(boat.id)}
                    className="text-xs text-red-500 hover:opacity-70 transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {editingId === boat.id && (
                <div className="border-t border-border px-5 py-5">
                  <BoatForm
                    boat={boat}
                    onSave={handleSaveBoat}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}

              {/* Equipment & Warranty section */}
              <div className="border-t border-border px-5 py-3">
                <BoatEquipment
                  boatId={boat.id}
                  boatInfo={{ name: boat.name, make: boat.make, model: boat.model, year: boat.year }}
                  engineInfo={{ engineMake: boat.engineMake, engineModel: boat.engineModel, engineType: boat.engineType, engineCount: boat.engineCount }}
                />
              </div>

              {/* Documents section */}
              <div className="border-t border-border px-5 py-3">
                <BoatDocuments boatId={boat.id} />
              </div>
            </div>
          ))}

          {/* Add new boat */}
          {addingNew ? (
            <div className="border border-dashed border-primary/50 rounded-lg px-5 py-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Add New Boat</h3>
              <BoatForm
                boat={{ id: `boat-${Date.now()}`, ...EMPTY_BOAT }}
                onSave={handleAddBoat}
                onCancel={() => setAddingNew(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="w-full border border-dashed border-border rounded-lg p-5 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Boat
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
