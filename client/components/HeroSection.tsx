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

const PROJECT_TEMPLATES = [
  { icon: "⚙️", label: "Annual Service", title: "Annual Engine Service", description: "Annual engine service including oil & filter change, spark plugs, gear lube, impeller check, and multi-point inspection." },
  { icon: "🎨", label: "Bottom Paint", title: "Bottom Paint & Antifouling", description: "Full hull cleaning, light sanding, and application of antifouling bottom paint to prevent marine growth." },
  { icon: "❄️", label: "Winterization", title: "Engine Winterization", description: "Full winterization service including fogging, fuel stabilizer, coolant flush, and outdoor storage prep." },
  { icon: "✨", label: "Full Detail", title: "Full Boat Detail & Wax", description: "Complete hull and interior detail including clay bar treatment, compound, polish, and carnauba wax seal." },
  { icon: "📡", label: "Electronics", title: "Chartplotter Installation", description: "Install and configure new GPS/chartplotter unit with transducer mounting and NMEA 2000 network integration." },
  { icon: "🔋", label: "Battery Upgrade", title: "Battery System Upgrade", description: "Replace aging battery bank, upgrade to AGM or lithium, and inspect all electrical connections and charging system." },
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

  // Sync hero image, boat info, and location when returning from other pages
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

  // Save current hero image as the default file on the server (dev only)
  useEffect(() => {
    const stored = localStorage.getItem("hero_image");
    if (stored && import.meta.env.DEV) {
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
                  Choose a template or select a category to get started.
                </DialogDescription>
              </DialogHeader>

              {/* Quick templates */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Quick Templates
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {PROJECT_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => handleSelectTemplate(t)}
                      className="flex items-center gap-2 text-left p-2.5 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                    >
                      <span className="text-lg leading-none">{t.icon}</span>
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary leading-tight">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Browse Categories
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROJECT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      className="flex items-start gap-3 text-left p-3 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                      onClick={() => handleSelectCategory(cat.label)}
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
                    onClick={() => setStep("details")}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Project details + photo upload */}
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
                  <p className="text-base font-semibold text-foreground">Project Posted!</p>
                  <p className="text-sm text-muted-foreground">
                    Verified vendors in your area will review your project and submit bids.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
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
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe the work needed, any issues you've noticed, your timeline, and any special requirements…"
                      rows={4}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>

                  {/* Photo upload */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Photos <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <svg className="w-6 h-6 text-muted-foreground mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
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
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
