import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, markOnboardingComplete, updateCurrentUser } from "@/data/authUtils";
import { useRole } from "@/context/RoleContext";
import { BOAT_MAKES, BOAT_MODELS, type BoatMake } from "@/data/boatData";
import { ENGINE_DATA, ENGINE_TYPES, OUTBOARD_COUNTS, type EngineType } from "@/data/engineData";
import { VENDOR_SPECIALTIES, VENDOR_CERTIFICATIONS } from "@/data/onboardingData";
import { createVendorProfileFromOnboarding, saveCustomVendorProfile } from "@/data/vendorProfileUtils";

// ─── Types ──────────────────────────────────────────────────────────────────

type OwnerStep = "welcome" | "location" | "boat" | "done";
type VendorStep = "welcome" | "business" | "services" | "area-bio" | "done";
type Step = OwnerStep | VendorStep;

const OWNER_STEPS: OwnerStep[] = ["welcome", "location", "boat", "done"];
const VENDOR_STEPS: VendorStep[] = ["welcome", "business", "services", "area-bio", "done"];

interface BoatForm {
  make: string; model: string; year: string; name: string;
  engineType: string; engineMake: string; engineModel: string; engineCount: string;
}

const EMPTY_BOAT: BoatForm = {
  make: "", model: "", year: "", name: "",
  engineType: "", engineMake: "", engineModel: "", engineCount: "",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => String(CURRENT_YEAR - i));

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const { setVendorMode, setOwnerMode } = useRole();
  const user = getCurrentUser()!;
  const isVendor = user.role === "vendor";
  const steps: Step[] = isVendor ? VENDOR_STEPS : OWNER_STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];

  // Owner state
  const [location, setLocation] = useState("");
  const [boat, setBoat] = useState<BoatForm>({ ...EMPTY_BOAT });

  // Vendor state
  const [businessName, setBusinessName] = useState(user.name);
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [insured, setInsured] = useState(false);
  const [licensed, setLicensed] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [customCert, setCustomCert] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [bio, setBio] = useState("");

  function next() { setStepIndex((i) => Math.min(i + 1, steps.length - 1)); }
  function back() { setStepIndex((i) => Math.max(i - 1, 0)); }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function toggleCert(c: string) {
    setCertifications((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  function addCustomCert() {
    const trimmed = customCert.trim();
    if (trimmed && !certifications.includes(trimmed)) {
      setCertifications((prev) => [...prev, trimmed]);
    }
    setCustomCert("");
  }

  function handleComplete() {
    if (isVendor) {
      // Build initials from business name
      const initials = businessName
        .split(" ")
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);

      const profile = createVendorProfileFromOnboarding({
        name: businessName.trim(),
        initials,
        yearsInBusiness: parseInt(yearsInBusiness) || 0,
        insured,
        licensed,
        specialties,
        certifications,
        serviceArea: serviceArea.trim(),
        bio: bio.trim(),
      });
      saveCustomVendorProfile(profile);

      // Update user record if business name changed
      if (businessName.trim() !== user.name) {
        updateCurrentUser({
          name: businessName.trim(),
          initials,
          vendorId: businessName.trim(),
        });
      }

      setVendorMode(businessName.trim());
    } else {
      // Save boat if any fields were filled
      const hasBoat = boat.make || boat.model || boat.name;
      if (hasBoat) {
        const savedBoat = {
          id: `boat-${Date.now()}`,
          ...boat,
          isPrimary: true,
        };
        localStorage.setItem("my_fleet", JSON.stringify([savedBoat]));
        localStorage.setItem("my_boat", JSON.stringify(savedBoat));
      }

      // Save location
      if (location.trim()) {
        localStorage.setItem("user_location", location.trim());
      }

      setOwnerMode();
    }

    markOnboardingComplete();
    navigate(isVendor ? "/vendor-dashboard" : "/");
  }

  // ── Shared form classes ──────────────────────────────────────────────────
  const inputCls = "w-full border border-border rounded-md px-3 py-2.5 text-sm text-foreground bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition";
  const selectCls = inputCls;
  const selectDisCls = `${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`;

  // ── Computed ─────────────────────────────────────────────────────────────
  const boatModels = boat.make ? (BOAT_MODELS[boat.make as BoatMake] ?? []) : [];
  const engineMakes = boat.engineType ? Object.keys(ENGINE_DATA[boat.engineType as EngineType]) : [];
  const engineModels = boat.engineType && boat.engineMake
    ? (ENGINE_DATA[boat.engineType as EngineType][boat.engineMake] ?? [])
    : [];

  const totalContentSteps = steps.length - 1; // exclude "done" from count
  const progressPercent = currentStep === "done" ? 100 : Math.round((stepIndex / totalContentSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header with progress ───────────────────────────────── */}
      <div className="bg-white border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <span className="text-lg font-bold tracking-tight text-foreground">Bosun</span>
          {currentStep !== "done" && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Step {stepIndex + 1} of {totalContentSteps}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Step content ───────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── WELCOME ──────────────────────────────────────── */}
          {currentStep === "welcome" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto mb-6">
                {isVendor ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
                {isVendor
                  ? "Let's set up your business profile so boat owners can find and hire you."
                  : "Let's set up your profile so you can start managing your boat and finding the right vendors."
                }
              </p>
              <button
                onClick={next}
                className="px-8 py-3 rounded-md bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {/* ── OWNER: LOCATION ──────────────────────────────── */}
          {currentStep === "location" && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Where's your home port?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                This helps vendors in your area find you. You can always change it later.
              </p>
              <label className="block text-xs font-medium text-foreground mb-1.5">Marina / Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Miami, FL · Biscayne Bay Marina"
                className={inputCls}
              />
              <StepNav onBack={back} onNext={next} onSkip={next} />
            </div>
          )}

          {/* ── OWNER: BOAT ──────────────────────────────────── */}
          {currentStep === "boat" && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Add your first boat</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We'll use this to match you with the right vendors and services. You can add more boats later.
              </p>

              {/* Boat details */}
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-semibold text-foreground">Boat Details</h3>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Make</label>
                  <select value={boat.make} onChange={(e) => setBoat({ ...boat, make: e.target.value, model: "" })} className={selectCls}>
                    <option value="">Select a make…</option>
                    {BOAT_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Model</label>
                  <select value={boat.model} onChange={(e) => setBoat({ ...boat, model: e.target.value })} disabled={!boat.make} className={selectDisCls}>
                    <option value="">{boat.make ? "Select a model…" : "Select a make first…"}</option>
                    {boatModels.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Year</label>
                  <select value={boat.year} onChange={(e) => setBoat({ ...boat, year: e.target.value })} className={selectCls}>
                    <option value="">Select a year…</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Boat Name <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={boat.name}
                    onChange={(e) => setBoat({ ...boat, name: e.target.value })}
                    placeholder="e.g. Serenity, Lady Luck"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Engine details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Engine Details</h3>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Engine Type</label>
                  <select value={boat.engineType} onChange={(e) => setBoat({ ...boat, engineType: e.target.value, engineMake: "", engineModel: "", engineCount: "" })} className={selectCls}>
                    <option value="">Select engine type…</option>
                    {ENGINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {boat.engineType === "Outboard" && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Number of Engines</label>
                    <select value={boat.engineCount} onChange={(e) => setBoat({ ...boat, engineCount: e.target.value })} className={selectCls}>
                      <option value="">Select count…</option>
                      {OUTBOARD_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Engine Make</label>
                  <select value={boat.engineMake} onChange={(e) => setBoat({ ...boat, engineMake: e.target.value, engineModel: "" })} disabled={!boat.engineType} className={selectDisCls}>
                    <option value="">{boat.engineType ? "Select a make…" : "Select engine type first…"}</option>
                    {engineMakes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Engine Model</label>
                  <select value={boat.engineModel} onChange={(e) => setBoat({ ...boat, engineModel: e.target.value })} disabled={!boat.engineMake} className={selectDisCls}>
                    <option value="">{boat.engineMake ? "Select a model…" : "Select a make first…"}</option>
                    {engineModels.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <StepNav onBack={back} onNext={next} onSkip={next} />
            </div>
          )}

          {/* ── VENDOR: BUSINESS DETAILS ─────────────────────── */}
          {currentStep === "business" && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Business details</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Tell us about your marine service business.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Smith Marine Services"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Years in Business</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={yearsInBusiness}
                    onChange={(e) => setYearsInBusiness(e.target.value)}
                    placeholder="e.g. 5"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <ToggleCard
                    label="Insured"
                    description="Business liability insurance"
                    active={insured}
                    onToggle={() => setInsured((v) => !v)}
                  />
                  <ToggleCard
                    label="Licensed"
                    description="State or local trade license"
                    active={licensed}
                    onToggle={() => setLicensed((v) => !v)}
                  />
                </div>
              </div>

              <StepNav onBack={back} onNext={next} />
            </div>
          )}

          {/* ── VENDOR: SERVICES & CERTIFICATIONS ────────────── */}
          {currentStep === "services" && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Services & certifications</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Select the services you offer and any certifications you hold.
              </p>

              {/* Specialties */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_SPECIALTIES.map((s) => {
                    const active = specialties.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          active
                            ? "bg-foreground text-white border-foreground"
                            : "bg-white text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Certifications</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {VENDOR_CERTIFICATIONS.map((c) => {
                    const active = certifications.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCert(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          active
                            ? "bg-foreground text-white border-foreground"
                            : "bg-white text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                  {/* Show custom certs that aren't in the predefined list */}
                  {certifications
                    .filter((c) => !(VENDOR_CERTIFICATIONS as readonly string[]).includes(c))
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCert(c)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-foreground text-white border border-foreground transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                </div>
                {/* Custom cert input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCert}
                    onChange={(e) => setCustomCert(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCert(); } }}
                    placeholder="Add a certification…"
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    type="button"
                    onClick={addCustomCert}
                    disabled={!customCert.trim()}
                    className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              <StepNav onBack={back} onNext={next} onSkip={next} />
            </div>
          )}

          {/* ── VENDOR: SERVICE AREA & BIO ────────────────────── */}
          {currentStep === "area-bio" && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Service area & bio</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Help boat owners know where you operate and what makes your business stand out.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Service Area</label>
                  <input
                    type="text"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="e.g. Miami · Fort Lauderdale · Dania Beach"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">About Your Business</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                    placeholder="Tell boat owners about your experience, equipment, and what sets you apart…"
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              <StepNav onBack={back} onNext={next} onSkip={next} />
            </div>
          )}

          {/* ── DONE ─────────────────────────────────────────── */}
          {currentStep === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">You're all set!</h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
                {isVendor
                  ? "Your business profile is ready. Start browsing open projects and landing your first job."
                  : "Your profile is set up. Start posting projects and finding the right vendors for your boat."
                }
              </p>
              <button
                onClick={handleComplete}
                className="px-8 py-3 rounded-md bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors"
              >
                {isVendor ? "Go to Vendor Dashboard" : "Go to Dashboard"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepNav({
  onBack,
  onNext,
  onSkip,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
        <button
          onClick={onNext}
          className="px-5 py-2.5 rounded-md bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ToggleCard({
  label,
  description,
  active,
  onToggle,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col items-center gap-1 py-4 px-3 rounded-lg border text-center transition-colors ${
        active
          ? "border-foreground bg-foreground text-white"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`text-[10px] ${active ? "text-white/70" : "text-muted-foreground"}`}>{description}</span>
      <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        active ? "border-white" : "border-border"
      }`}>
        {active && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
