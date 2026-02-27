import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ENGINE_DATA, ENGINE_TYPE_ICONS, type EngineType } from "@/data/engineData";

const PROJECT_CATEGORIES = [
  { icon: "⚙️", label: "Engine Service", description: "Oil changes, tune-ups, impeller replacement, winterization" },
  { icon: "✨", label: "Detailing & Waxing", description: "Hull cleaning, buffing, waxing, interior detailing" },
  { icon: "🪵", label: "Decking & Upholstery", description: "Teak decking, vinyl flooring, seat re-upholstery" },
  { icon: "⚡", label: "Electrical", description: "Wiring, bilge pumps, lighting, battery systems" },
  { icon: "📡", label: "Electronics & AV", description: "GPS, fishfinders, stereo systems, chartplotters" },
  { icon: "🚤", label: "Hull & Gelcoat", description: "Osmotic blistering, gelcoat repair, antifouling paint" },
  { icon: "⚓", label: "Mechanical", description: "Steering, throttle, trim tabs, outdrive service" },
  { icon: "🔧", label: "Other / Custom", description: "Something else not listed above" },
];

const DEFAULT_HERO = "https://cdn.builder.io/api/v1/image/assets%2F6d21a31dd9f5464480f247d960742b01%2Fbc990cddf7ea4c13b79484a350ac1943?format=webp&width=1400&height=700";

type Step = "category" | "engine";

export default function HeroSection() {
  const [open, setOpen] = useState(false);
  const [heroImage, setHeroImage] = useState(
    () => localStorage.getItem("hero_image") ?? DEFAULT_HERO
  );
  const [boatInfo, setBoatInfo] = useState(() => {
    try {
      const stored = localStorage.getItem("my_boat");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [location, setLocation] = useState<string>(
    () => localStorage.getItem("user_location") ?? ""
  );
  const [step, setStep] = useState<Step>("category");

  // Sync hero image, boat info, and location when returning from other pages
  useEffect(() => {
    const onFocus = () => {
      setHeroImage(localStorage.getItem("hero_image") ?? DEFAULT_HERO);
      setLocation(localStorage.getItem("user_location") ?? "");
      try {
        const stored = localStorage.getItem("my_boat");
        setBoatInfo(stored ? JSON.parse(stored) : null);
      } catch {}
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  const [engineType, setEngineType] = useState<EngineType | null>(null);
  const [make, setMake] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setStep("category");
      setEngineType(null);
      setMake(null);
      setModel(null);
    }, 200);
  }

  function handleEngineTypeSelect(type: EngineType) {
    setEngineType(type);
    setMake(null);
    setModel(null);
  }

  function handleMakeSelect(selectedMake: string) {
    setMake(selectedMake);
    setModel(null);
  }

  const availableMakes = engineType ? Object.keys(ENGINE_DATA[engineType]) : [];
  const availableModels = engineType && make ? ENGINE_DATA[engineType][make] : [];
  const canSubmit = engineType && make && model;

  // Build engine display string from saved boat info (strip year range from model)
  const engineModel = boatInfo?.engineModel?.replace(/\s*\([\d–\-]+.*?\)$/, "") || null;
  const engineDisplay = [
    boatInfo?.engineType === "Outboard" ? boatInfo?.engineCount || null : null,
    boatInfo?.engineMake || null,
    engineModel,
  ].filter(Boolean).join(" ");

  return (
    <section className="bg-white">
      {/* Hero Image */}
      <div className="w-full h-80 sm:h-96 bg-gray-200 overflow-hidden rounded-lg mb-6">
        <img
          src={heroImage}
          alt="Hero boat image"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hero Content */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-1">
          {boatInfo?.name ||
            (boatInfo?.make
              ? [boatInfo.year, boatInfo.make, boatInfo.model].filter(Boolean).join(" ")
              : "My Boat")}
        </h1>
        {boatInfo?.name && (boatInfo.make || boatInfo.year) && (
          <p className="text-sm text-muted-foreground mb-1">
            {[boatInfo.year, boatInfo.make, boatInfo.model].filter(Boolean).join(" ")}
            {engineDisplay && ` · ${engineDisplay}`}
          </p>
        )}
        {/* When no boat name, show engine info below the h1 */}
        {!boatInfo?.name && engineDisplay && (
          <p className="text-sm text-muted-foreground mb-1">{engineDisplay}</p>
        )}
        {location && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location}
          </p>
        )}
        <p className="text-base text-muted-foreground mb-6 max-w-2xl">
          Connect with trusted marine contractors for all your boat maintenance and repair needs.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" />
          </svg>
          Start a New Project
        </button>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">

          {/* Step 1: Category selection */}
          {step === "category" && (
            <>
              <DialogHeader>
                <DialogTitle>Start a New Project</DialogTitle>
                <DialogDescription>
                  What kind of work does your boat need? Select a category to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {PROJECT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    className="flex items-start gap-3 text-left p-3 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                    onClick={() =>
                      cat.label === "Engine Service"
                        ? setStep("engine")
                        : handleClose()
                    }
                  >
                    <span className="text-2xl leading-none mt-0.5">{cat.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                        {cat.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {cat.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Engine configuration */}
          {step === "engine" && (
            <>
              <DialogHeader>
                <DialogTitle>Engine Service</DialogTitle>
                <DialogDescription>
                  Tell us about your engine so we can match you with the right technician.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-1">
                {/* Engine Type */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Engine Type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(ENGINE_DATA) as EngineType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleEngineTypeSelect(type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-md border text-center transition-colors ${
                          engineType === type
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary hover:bg-primary/5 text-foreground"
                        }`}
                      >
                        <span className="text-xl">{ENGINE_TYPE_ICONS[type]}</span>
                        <span className="text-xs font-semibold leading-tight">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Make */}
                {engineType && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Make</p>
                    <div className="flex flex-wrap gap-2">
                      {availableMakes.map((m) => (
                        <button
                          key={m}
                          onClick={() => handleMakeSelect(m)}
                          className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                            make === m
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary hover:bg-primary/5 text-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model */}
                {make && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Model</p>
                    <select
                      value={model ?? ""}
                      onChange={(e) => setModel(e.target.value || null)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select a model…</option>
                      {availableModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setStep("category");
                      setEngineType(null);
                      setMake(null);
                      setModel(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    disabled={!canSubmit}
                    onClick={handleClose}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Find Technicians
                  </button>
                </div>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </section>
  );
}
