import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ENGINE_DATA, type EngineType } from "@/data/engineData";

// ─── Icons ───────────────────────────────────────────────────
function SvgIcon({ d, d2, className = "w-5 h-5" }: { d: string; d2?: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
      {d2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d2} />}
    </svg>
  );
}

// Heroicons-style paths
const ICONS = {
  engine: {
    d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    d2: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  sparkles: {
    d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  },
  layers: {
    d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
  bolt: {
    d: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  },
  monitor: {
    d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  anchor: {
    d: "M12 2a3 3 0 110 6 3 3 0 010-6zm0 4v12M5 11h14M5 18c1.5 2 3.5 3 7 3s5.5-1 7-3",
  },
  tool: {
    d: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  },
  sliders: {
    d: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  },
  paint: {
    d: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  },
  snowflake: {
    d: "M12 3v18M3 12h18M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66",
  },
  battery: {
    d: "M21 10h1a1 1 0 011 1v2a1 1 0 01-1 1h-1M3 6h14a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2zm4 3v6m4-6v6",
  },
};

const PROJECT_CATEGORIES: {
  icon: keyof typeof ICONS;
  label: string;
  description: string;
}[] = [
  { icon: "engine",   label: "Engine Service",      description: "Oil changes, tune-ups, impeller replacement, winterization" },
  { icon: "sparkles", label: "Detailing & Waxing",  description: "Hull cleaning, buffing, waxing, interior detailing" },
  { icon: "layers",   label: "Decking & Upholstery",description: "Teak decking, vinyl flooring, seat re-upholstery" },
  { icon: "bolt",     label: "Electrical",           description: "Wiring, bilge pumps, lighting, battery systems" },
  { icon: "monitor",  label: "Electronics & AV",     description: "GPS, fishfinders, stereo systems, chartplotters" },
  { icon: "anchor",   label: "Hull & Gelcoat",       description: "Osmotic blistering, gelcoat repair, antifouling paint" },
  { icon: "tool",     label: "Mechanical",           description: "Steering, throttle, trim tabs, outdrive service" },
  { icon: "sliders",  label: "Other / Custom",       description: "Something else not listed above" },
];

const PROJECT_TEMPLATES: {
  icon: keyof typeof ICONS;
  label: string;
  title: string;
  description: string;
}[] = [
  { icon: "engine",    label: "Annual Service", title: "Annual Engine Service",         description: "Annual engine service including oil & filter change, spark plugs, gear lube, impeller check, and multi-point inspection." },
  { icon: "paint",     label: "Bottom Paint",   title: "Bottom Paint & Antifouling",    description: "Full hull cleaning, light sanding, and application of antifouling bottom paint to prevent marine growth." },
  { icon: "snowflake", label: "Winterization",  title: "Engine Winterization",          description: "Full winterization service including fogging, fuel stabilizer, coolant flush, and outdoor storage prep." },
  { icon: "sparkles",  label: "Full Detail",    title: "Full Boat Detail & Wax",        description: "Complete hull and interior detail including clay bar treatment, compound, polish, and carnauba wax seal." },
  { icon: "monitor",   label: "Electronics",    title: "Chartplotter Installation",     description: "Install and configure new GPS/chartplotter unit with transducer mounting and NMEA 2000 network integration." },
  { icon: "battery",   label: "Battery Upgrade",title: "Battery System Upgrade",        description: "Replace aging battery bank, upgrade to AGM or lithium, and inspect all electrical connections and charging system." },
];

const DEFAULT_HERO = "/hero-default.jpg";

const DEFAULT_BOAT = {
  id: "boat-1773000691182",
  make: "Sea Ray",
  model: "SDX 250 OB",
  year: "2020",
  name: "No Vacancy",
  engineType: "Outboard" as EngineType,
  engineMake: "Mercury",
  engineModel: "Verado 250 (2021–present)",
  engineCount: "Single",
  isPrimary: true,
};

type Step = "category" | "engine" | "details";

export default function HeroSection() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [heroImage, setHeroImage] = useState(
    () => localStorage.getItem("hero_image") ?? DEFAULT_HERO
  );
  const [boatInfo, setBoatInfo] = useState(() => {
    try {
      const stored = localStorage.getItem("my_boat");
      return stored ? JSON.parse(stored) : DEFAULT_BOAT;
    } catch {
      return DEFAULT_BOAT;
    }
  });
  const [location, setLocation] = useState<string>(
    () => localStorage.getItem("user_location") ?? ""
  );
  const [step, setStep] = useState<Step>("category");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [postSubmitted, setPostSubmitted] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      setHeroImage(localStorage.getItem("hero_image") ?? DEFAULT_HERO);
      setLocation(localStorage.getItem("user_location") ?? "");
      try {
        const stored = localStorage.getItem("my_boat");
        setBoatInfo(stored ? JSON.parse(stored) : DEFAULT_BOAT);
      } catch {}
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("hero_image");
    if (stored) {
      fetch("/api/save-default-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: stored }),
      }).catch(() => {});
    }
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
      setProjectTitle("");
      setProjectDescription("");
      setProjectPhotos([]);
      setPostSubmitted(false);
    }, 200);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setProjectPhotos((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function handleSelectCategory(label: string) {
    if (label === "Engine Service") {
      setStep("engine");
    } else {
      setStep("details");
    }
  }

  function handleSelectTemplate(template: typeof PROJECT_TEMPLATES[0]) {
    setProjectTitle(template.title);
    setProjectDescription(template.description);
    setStep("details");
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

  const engineModel = boatInfo?.engineModel?.replace(/\s*\([\d–\-]+.*?\)$/, "") || null;
  const engineDisplay = [
    boatInfo?.engineType === "Outboard" ? boatInfo?.engineCount || null : null,
    boatInfo?.engineMake || null,
    engineModel,
  ].filter(Boolean).join(" ");

  return (
    <section>
      {/* Full-bleed hero */}
      <div
        className="relative h-[240px] sm:h-[340px] overflow-hidden"
        style={{ backgroundColor: "#ffffff" }}
      >
        <img
          src={heroImage}
          alt="Hero boat image"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Boat info strip */}
      <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-1 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-foreground leading-tight">
          {boatInfo?.name ||
            (boatInfo?.make
              ? [boatInfo.year, boatInfo.make, boatInfo.model].filter(Boolean).join(" ")
              : "My Boat")}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {boatInfo?.name && (boatInfo.make || boatInfo.year) && (
            <p className="text-sm text-muted-foreground">
              {[boatInfo.year, boatInfo.make, boatInfo.model].filter(Boolean).join(" ")}
              {engineDisplay && ` · ${engineDisplay}`}
            </p>
          )}
          {!boatInfo?.name && engineDisplay && (
            <p className="text-sm text-muted-foreground">{engineDisplay}</p>
          )}
          {location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}
            </p>
          )}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-1 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-6xl mx-auto">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-3 sm:py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" />
          </svg>
          Start a New Project
        </button>
        <button
          onClick={() => navigate("/find-crew?post=1")}
          className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-3 sm:py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Find Crew
        </button>
        <button
          onClick={() => navigate("/find-crew")}
          className="flex items-center justify-center gap-2 border border-border text-foreground px-4 py-3 sm:py-2.5 rounded-md text-sm font-semibold hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Browse Crew
        </button>
        <button
          onClick={() => navigate("/vendors")}
          className="flex items-center justify-center gap-2 border border-border text-foreground px-4 py-3 sm:py-2.5 rounded-md text-sm font-semibold hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Browse Vendors
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
                  Choose a template or select a category to get started.
                </DialogDescription>
              </DialogHeader>

              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Quick Templates
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {PROJECT_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => handleSelectTemplate(t)}
                      className="flex items-center gap-2 text-left p-2.5 rounded-md border border-border hover:border-foreground/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded flex items-center justify-center bg-muted flex-shrink-0 group-hover:bg-muted">
                        <SvgIcon d={ICONS[t.icon].d} d2={ICONS[t.icon].d2} className="w-4 h-4 text-foreground/70" />
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-tight">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Browse Categories
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROJECT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      className="flex items-center gap-3 text-left px-3 py-2.5 rounded-md border border-border hover:border-foreground/30 hover:bg-muted/50 transition-colors group"
                      onClick={() => handleSelectCategory(cat.label)}
                    >
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-muted flex-shrink-0">
                        <SvgIcon d={ICONS[cat.icon].d} d2={ICONS[cat.icon].d2} className="w-4 h-4 text-foreground/70" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {cat.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
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
                        className={`px-3 py-2.5 rounded-md border text-center text-sm font-medium transition-colors ${
                          engineType === type
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground/30 text-foreground"
                        }`}
                      >
                        {type}
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
                          className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                            make === m
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground/30 text-foreground"
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
                    onClick={() => setStep("details")}
                    className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Project details */}
          {step === "details" && (
            <>
              <DialogHeader>
                <DialogTitle>Project Details</DialogTitle>
                <DialogDescription>
                  Describe what you need so vendors can give you an accurate quote.
                </DialogDescription>
              </DialogHeader>

              {postSubmitted ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-foreground">Project Posted</p>
                  <p className="text-sm text-muted-foreground">
                    Verified vendors in your area will review your project and submit bids.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-4 py-2 rounded-md bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Project Title</label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="e.g. Annual Engine Service"
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe the work needed, any issues you've noticed, your timeline, and any special requirements…"
                      rows={4}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Photos <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <label className="flex flex-col items-center justify-center w-full border border-dashed border-border rounded-md p-4 cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors">
                      <svg className="w-5 h-5 text-muted-foreground mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-muted-foreground">Click to upload photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {projectPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {projectPhotos.map((src, i) => (
                          <div key={i} className="relative">
                            <img src={src} className="w-16 h-16 rounded-md object-cover border border-border" />
                            <button
                              onClick={() => setProjectPhotos((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-foreground text-background rounded-full text-[10px] flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setStep("category")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={!projectTitle.trim()}
                      onClick={() => setPostSubmitted(true)}
                      className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Post Project
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </DialogContent>
      </Dialog>
    </section>
  );
}
