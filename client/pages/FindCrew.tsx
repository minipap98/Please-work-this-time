import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CREW_MEMBERS,
  CREW_ROLES,
  ROLE_STYLES,
  AVAILABILITY_STYLES,
  type CrewRole,
} from "@/data/crewData";
import Header from "@/components/Header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type RoleFilter = "All" | CrewRole;

const TRIP_TYPES = ["Day Trip", "Overnight", "Weekend", "Multi-Day Passage", "Delivery", "Event / Charter"];

export default function FindCrew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [availableOnly, setAvailableOnly] = useState(false);

  // ── RFP Modal state ───────────────────────────────────────
  const [rfpOpen, setRfpOpen] = useState(() => searchParams.get("post") === "1");
  const [rfpSubmitted, setRfpSubmitted] = useState(false);

  // RFP fields
  const [rfpRoles, setRfpRoles] = useState<CrewRole[]>([]);
  const [rfpTripType, setRfpTripType] = useState("");
  const [rfpStartDate, setRfpStartDate] = useState("");
  const [rfpDuration, setRfpDuration] = useState("");
  const [rfpDeparture, setRfpDeparture] = useState("");
  const [rfpDestination, setRfpDestination] = useState("");
  const [rfpGuests, setRfpGuests] = useState("");
  const [rfpBudgetMin, setRfpBudgetMin] = useState("");
  const [rfpBudgetMax, setRfpBudgetMax] = useState("");
  const [rfpNotes, setRfpNotes] = useState("");

  const boatInfo = useMemo(() => {
    try {
      const stored = localStorage.getItem("my_boat");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }, []);

  const boatLabel = boatInfo
    ? `${boatInfo.name || [boatInfo.year, boatInfo.make, boatInfo.model].filter(Boolean).join(" ")}`.trim()
    : "My Vessel";

  function toggleRole(role: CrewRole) {
    setRfpRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  }

  function handleOpenRfp() {
    setRfpSubmitted(false);
    setRfpRoles([]);
    setRfpTripType("");
    setRfpStartDate("");
    setRfpDuration("");
    setRfpDeparture("");
    setRfpDestination("");
    setRfpGuests("");
    setRfpBudgetMin("");
    setRfpBudgetMax("");
    setRfpNotes("");
    setRfpOpen(true);
  }

  const rfpCanSubmit = rfpRoles.length > 0 && rfpStartDate && rfpDeparture;

  // ── Crew list filters ──────────────────────────────────────
  const filtered = useMemo(() => {
    return CREW_MEMBERS.filter((c) => {
      if (roleFilter !== "All" && c.role !== roleFilter) return false;
      if (availableOnly && c.availability === "busy") return false;
      return true;
    });
  }, [roleFilter, availableOnly]);

  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilter, number> = { All: CREW_MEMBERS.length } as Record<RoleFilter, number>;
    for (const role of CREW_ROLES) {
      counts[role] = CREW_MEMBERS.filter((c) => c.role === role).length;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* ── Page header ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Find Crew for Your Trip</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse experienced maritime crew or post an RFP to receive bids.
              </p>
            </div>
            <button
              onClick={handleOpenRfp}
              className="flex-shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Post Job
            </button>
          </div>

          {/* Role filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {(["All", ...CREW_ROLES] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  roleFilter === role
                    ? "bg-black text-white"
                    : "bg-white border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {role}
                <span className="ml-1.5 text-xs opacity-60">{roleCounts[role]}</span>
              </button>
            ))}
          </div>

          {/* Available only toggle */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setAvailableOnly((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                availableOnly ? "bg-foreground" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${availableOnly ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-muted-foreground">Available only</span>
          </div>
        </div>
      </div>

      {/* ── Crew grid ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No crew found for this filter.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((member) => {
              const roleStyle = ROLE_STYLES[member.role];
              const avail = AVAILABILITY_STYLES[member.availability];
              return (
                <button
                  key={member.id}
                  onClick={() => navigate(`/find-crew/${member.id}`)}
                  className="text-left bg-white border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${roleStyle.avatar}`}>
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{member.name}</p>
                      <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 ${roleStyle.badge}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${avail.dot}`} />
                    <span className="text-xs text-muted-foreground">{avail.label}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="font-medium text-foreground">{member.rating}</span>
                      <span>({member.reviewCount})</span>
                      <span className="text-border mx-1">·</span>
                      <span>{member.yearsExperience} yrs</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      ${member.dayRate.toLocaleString()}<span className="text-xs font-normal text-muted-foreground"> / day</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-auto">
                    {member.certifications.slice(0, 2).map((cert) => (
                      <span key={cert} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 leading-none">
                        {cert.split(" – ")[0].split(" (")[0]}
                      </span>
                    ))}
                    {member.certifications.length > 2 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 leading-none">
                        +{member.certifications.length - 2}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          {filtered.length} crew member{filtered.length !== 1 ? "s" : ""} · South Florida & Bahamas
        </p>
      </div>

      {/* ── RFP Dialog ── */}
      <Dialog open={rfpOpen} onOpenChange={(v) => !v && setRfpOpen(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Crew RFP</DialogTitle>
            <DialogDescription>
              Describe your trip and the crew you need. Qualified crew will review your RFP and submit bids.
            </DialogDescription>
          </DialogHeader>

          {rfpSubmitted ? (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-foreground">RFP Posted</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your crew RFP has been submitted. Qualified crew matching your requirements will respond with bids.
              </p>
              <button
                onClick={() => setRfpOpen(false)}
                className="mt-2 px-4 py-2 rounded-md bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-5 pt-1">

              {/* Roles needed */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Crew Roles Needed <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CREW_ROLES.map((role) => {
                    const selected = rfpRoles.includes(role);
                    const style = ROLE_STYLES[role];
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selected
                            ? `${style.avatar} border-transparent`
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trip type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Trip Type</label>
                <div className="flex flex-wrap gap-2">
                  {TRIP_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setRfpTripType(rfpTripType === type ? "" : type)}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                        rfpTripType === type
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates + duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={rfpStartDate}
                    onChange={(e) => setRfpStartDate(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={rfpDuration}
                      onChange={(e) => setRfpDuration(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                    <span className="text-sm text-muted-foreground flex-shrink-0">days</span>
                  </div>
                </div>
              </div>

              {/* Ports */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Departure Port <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={rfpDeparture}
                    onChange={(e) => setRfpDeparture(e.target.value)}
                    placeholder="e.g. Fort Lauderdale"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Destination</label>
                  <input
                    type="text"
                    value={rfpDestination}
                    onChange={(e) => setRfpDestination(e.target.value)}
                    placeholder="e.g. Nassau, Bahamas"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>
              </div>

              {/* Vessel + guests */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Vessel</label>
                  <div className="border border-border rounded-md px-3 py-2 text-sm text-foreground bg-muted/40">
                    {boatLabel}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={rfpGuests}
                    onChange={(e) => setRfpGuests(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Budget Range <span className="text-muted-foreground font-normal">(per day, per person)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      value={rfpBudgetMin}
                      onChange={(e) => setRfpBudgetMin(e.target.value)}
                      placeholder="Min"
                      className="w-full border border-border rounded-md pl-6 pr-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      value={rfpBudgetMax}
                      onChange={(e) => setRfpBudgetMax(e.target.value)}
                      placeholder="Max"
                      className="w-full border border-border rounded-md pl-6 pr-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Additional Requirements <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={rfpNotes}
                  onChange={(e) => setRfpNotes(e.target.value)}
                  placeholder="e.g. Must have offshore experience, bilingual preferred, fishing knowledge a plus…"
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setRfpOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setRfpSubmitted(true)}
                  disabled={!rfpCanSubmit}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Submit RFP
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
