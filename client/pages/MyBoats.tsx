import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { BOAT_MAKES, BOAT_MODELS, type BoatMake } from "@/data/boatData";
import { ENGINE_DATA, ENGINE_TYPES, OUTBOARD_COUNTS, type EngineType } from "@/data/engineData";

const BOAT_STORAGE_KEY = "my_boat";

interface SavedBoat {
  make: string;
  model: string;
  year: string;
  name: string;
  engineType: string;
  engineMake: string;
  engineModel: string;
  engineCount: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) =>
  String(CURRENT_YEAR - i),
);

function loadSaved(): SavedBoat {
  try {
    const stored = localStorage.getItem(BOAT_STORAGE_KEY);
    if (stored) {
      return {
        engineType: "",
        engineMake: "",
        engineModel: "",
        engineCount: "",
        ...JSON.parse(stored),
      };
    }
  } catch {}
  return { make: "", model: "", year: "", name: "", engineType: "", engineMake: "", engineModel: "", engineCount: "" };
}

export default function MyBoats() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SavedBoat>(loadSaved);
  const [saved, setSaved] = useState(false);

  const boatModels = form.make ? (BOAT_MODELS[form.make as BoatMake] ?? []) : [];
  const engineMakes = form.engineType ? Object.keys(ENGINE_DATA[form.engineType as EngineType]) : [];
  const engineModels =
    form.engineType && form.engineMake
      ? ENGINE_DATA[form.engineType as EngineType][form.engineMake] ?? []
      : [];

  function handleMakeChange(make: string) {
    setForm({ ...form, make, model: "" });
    setSaved(false);
  }

  function handleEngineTypeChange(engineType: string) {
    setForm({ ...form, engineType, engineMake: "", engineModel: "", engineCount: "" });
    setSaved(false);
  }

  function handleEngineMakeChange(engineMake: string) {
    setForm({ ...form, engineMake, engineModel: "" });
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(BOAT_STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
    setTimeout(() => navigate("/"), 700);
  }

  const selectClass =
    "w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50";
  const selectDisabledClass = `${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-2xl font-semibold text-foreground mb-8">My Boats</h1>

        {/* ── Boat Details ── */}
        <section className="border border-border rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">Boat Details</h2>
            <p className="text-sm text-muted-foreground">
              Enter your boat information to personalize your dashboard.
            </p>
          </div>

          {/* Make */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Make</label>
            <select
              value={form.make}
              onChange={(e) => handleMakeChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a make…</option>
              {BOAT_MAKES.map((make) => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Model</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              disabled={!form.make}
              className={selectDisabledClass}
            >
              <option value="">{form.make ? "Select a model…" : "Select a make first…"}</option>
              {boatModels.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Year</label>
            <select
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className={selectClass}
            >
              <option value="">Select a year…</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Boat Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Boat Name{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false); }}
              placeholder="e.g. Serenity, Lady Luck, The Knot"
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This name will appear on your dashboard.
            </p>
          </div>
        </section>

        {/* ── Engine Details ── */}
        <section className="border border-border rounded-lg p-6 space-y-5 mt-6">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">Engine Details</h2>
            <p className="text-sm text-muted-foreground">
              Add your engine information for more accurate service matching.
            </p>
          </div>

          {/* Engine Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Engine Type</label>
            <select
              value={form.engineType}
              onChange={(e) => handleEngineTypeChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select engine type…</option>
              {ENGINE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Number of Engines — Outboard only */}
          {form.engineType === "Outboard" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Number of Engines
              </label>
              <select
                value={form.engineCount}
                onChange={(e) => { setForm({ ...form, engineCount: e.target.value }); setSaved(false); }}
                className={selectClass}
              >
                <option value="">Select count…</option>
                {OUTBOARD_COUNTS.map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
          )}

          {/* Engine Make */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Engine Make</label>
            <select
              value={form.engineMake}
              onChange={(e) => handleEngineMakeChange(e.target.value)}
              disabled={!form.engineType}
              className={selectDisabledClass}
            >
              <option value="">{form.engineType ? "Select a make…" : "Select engine type first…"}</option>
              {engineMakes.map((make) => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          {/* Engine Model */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Engine Model</label>
            <select
              value={form.engineModel}
              onChange={(e) => { setForm({ ...form, engineModel: e.target.value }); setSaved(false); }}
              disabled={!form.engineMake}
              className={selectDisabledClass}
            >
              <option value="">{form.engineMake ? "Select a model…" : "Select a make first…"}</option>
              {engineModels.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}
