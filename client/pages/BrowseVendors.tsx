import { PageContainer, PageHeader } from "@/components/app/Page";
import { useState, useMemo, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { lazyWithReload } from "@/lib/lazyRetry";
import { SectionBoundary } from "@/components/ErrorBoundary";
import { Anchor, LocateFixed, Loader2 } from "lucide-react";
import { getAllVendorProfiles } from "@/data/vendorProfileUtils";
import { VENDOR_PAST_PROJECTS } from "@/data/projectData";
import type { VendorProfile } from "@/data/vendorData";
import { useVendorProfiles } from "@/hooks/use-supabase";
import type { Tables } from "@/lib/database.types";
import { useAuth } from "@/context/AuthContext";
import { useDemoMode } from "@/lib/demoMode";
import { useMyBoats } from "@/hooks/use-my-boat";
import { distanceMiles, formatMiles } from "@shared/geo";

const VendorMap = lazyWithReload(() => import("@/components/VendorMap"));

type LatLng = { lat: number; lng: number };

/** The phone's or laptop's position, asked for only when the owner picks "Near me". */
function useMyLocation() {
  const [me, setMe] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("This browser can't share your location.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Allow it in your browser settings, or search near your boat instead."
            : "Couldn't get your location right now."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);
  return { me, locating, error, locate };
}

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

type SortOption = "distance" | "rating" | "reviews" | "jobs" | "response" | "experience";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "distance", label: "Nearest" },
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviews" },
  { value: "jobs", label: "Most Jobs" },
  { value: "response", label: "Fastest Response" },
  { value: "experience", label: "Most Experience" },
];

const RATING_OPTIONS = [
  { value: 0, label: "Any Rating" },
  { value: 4.5, label: "4.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 3.5, label: "3.5+" },
];

function parseResponseTimeMinutes(rt: string): number {
  if (rt.includes("30 min")) return 30;
  if (rt.includes("1 hour")) return 60;
  if (rt.includes("2 hour")) return 120;
  if (rt.includes("4 hour")) return 240;
  if (rt.includes("same day") || rt.includes("24")) return 1440;
  return 9999;
}

export default function BrowseVendors() {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [insuredOnly, setInsuredOnly] = useState(false);
  const [licensedOnly, setLicensedOnly] = useState(false);
  const { demo } = useDemoMode();
  const { profile } = useAuth();
  const { primary } = useMyBoats();
  // Where the owner's boat is kept (demo: Key Biscayne), for "Nearest" and "X mi away".
  const boatOrigin: LatLng | null = demo
    ? { lat: 25.7314, lng: -80.1696 }
    : primary?.home_port_lat != null && primary?.home_port_lng != null
      ? { lat: primary.home_port_lat, lng: primary.home_port_lng }
      : profile?.location_lat != null && profile?.location_lng != null
        ? { lat: profile.location_lat, lng: profile.location_lng }
        : null;
  // Search around the boat, or around wherever the owner is right now.
  const { me, locating, error: locationError, locate } = useMyLocation();
  const [originMode, setOriginMode] = useState<"boat" | "me">("boat");
  const origin: LatLng | null = originMode === "me" ? me : boatOrigin;
  const chooseMe = () => {
    setOriginMode("me");
    if (!me) locate();
  };
  const [sortChoice, setSortBy] = useState<SortOption | null>(null);
  const sortBy: SortOption = sortChoice ?? (origin ? "distance" : "rating");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  // How far from the owner's home port to look. The map widens this as you zoom out.
  const [radiusMiles, setRadiusMiles] = useState<number>(20);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  const { data: liveVendors } = useVendorProfiles();
  const allVendors = useMemo(() => {
    if (liveVendors && liveVendors.length > 0) {
      return (liveVendors as Tables<"vendor_profiles">[]).map((v) => ({
        id: v.id,
        name: v.business_name,
        initials: v.initials || v.business_name.slice(0, 2).toUpperCase(),
        rating: 0,
        reviewCount: 0,
        responseTime: v.response_time ?? "—",
        insured: v.insured,
        licensed: v.licensed,
        yearsInBusiness: v.years_in_business,
        specialties: v.specialties ?? [],
        certifications: v.certifications ?? [],
        serviceArea: v.service_area ?? "",
        bio: v.bio ?? "",
        completedJobs: v.completed_jobs ?? 0,
        phone: v.phone ?? undefined,
        lat: v.lat ?? undefined,
        lng: v.lng ?? undefined,
      }))
        // A shop with no verified location can't be placed or distance-checked, so it isn't listed.
        .filter((v) => v.lat != null && v.lng != null);
    }
    // Sample shops exist only in the demo; a live account sees real shops or none.
    if (!demo) return [];
    return Object.values(getAllVendorProfiles()).map((v) => ({ ...v, id: v.name }));
  }, [liveVendors, demo]);
  const milesTo = (v: { lat?: number; lng?: number }) =>
    origin && v.lat != null && v.lng != null ? distanceMiles(origin, { lat: v.lat, lng: v.lng }) : null;

  // Unique specialties
  const specialties = useMemo(
    () => Array.from(new Set(allVendors.flatMap((v) => v.specialties))).sort(),
    [allVendors]
  );

  // Unique certifications
  const certifications = useMemo(
    () => Array.from(new Set(allVendors.flatMap((v) => v.certifications))).sort(),
    [allVendors]
  );
  const [filterCert, setFilterCert] = useState("All");

  // Filter + sort
  const vendors = useMemo(() => {
    const q = search.toLowerCase();
    let filtered = allVendors.filter((v) => {
      // Text search
      if (q) {
        const matchesSearch =
          v.name.toLowerCase().includes(q) ||
          v.specialties.some((s) => s.toLowerCase().includes(q)) ||
          v.certifications.some((c) => c.toLowerCase().includes(q)) ||
          v.serviceArea.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Specialty
      if (filterSpecialty !== "All" && !v.specialties.includes(filterSpecialty)) return false;
      // Certification
      if (filterCert !== "All" && !v.certifications.includes(filterCert)) return false;
      // Rating
      if (minRating > 0 && v.rating < minRating) return false;
      // Insured
      if (insuredOnly && !v.insured) return false;
      // Licensed
      if (licensedOnly && !v.licensed) return false;
      // Near the boat: within the radius, or inside whatever the map is showing right now.
      if (origin && v.lat != null && v.lng != null) {
        const inRadius = radiusMiles === Infinity || distanceMiles(origin, { lat: v.lat, lng: v.lng }) <= radiusMiles;
        const inView = viewMode === "map" && mapBounds
          ? v.lat <= mapBounds.north && v.lat >= mapBounds.south && v.lng <= mapBounds.east && v.lng >= mapBounds.west
          : false;
        if (!inRadius && !inView) return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "distance": return (milesTo(a) ?? Infinity) - (milesTo(b) ?? Infinity);
        case "rating": return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case "reviews": return b.reviewCount - a.reviewCount;
        case "jobs": return b.completedJobs - a.completedJobs;
        case "response": return parseResponseTimeMinutes(a.responseTime) - parseResponseTimeMinutes(b.responseTime);
        case "experience": return b.yearsInBusiness - a.yearsInBusiness;
        default: return 0;
      }
    });

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVendors, search, filterSpecialty, filterCert, minRating, insuredOnly, licensedOnly, sortBy, origin?.lat, origin?.lng, radiusMiles, viewMode, mapBounds]);

  const activeFilterCount = [
    filterSpecialty !== "All",
    filterCert !== "All",
    minRating > 0,
    insuredOnly,
    licensedOnly,
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterSpecialty("All");
    setFilterCert("All");
    setMinRating(0);
    setInsuredOnly(false);
    setLicensedOnly(false);
    setSearch("");
  }

  return (
    <div className="min-h-full">
      <PageContainer>
        <PageHeader title="Find a shop" description="Verified marine shops and techs near your boat, or near you." />

        {/* Search bar + sort + filter toggle */}
        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search vendors, specialties, certifications, or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground hover:bg-muted/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expanded filters panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Specialty */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Specialty</label>
                  <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    className="w-full border border-border rounded-lg px-2.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="All">All Specialties</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Certification */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Certification</label>
                  <select
                    value={filterCert}
                    onChange={(e) => setFilterCert(e.target.value)}
                    className="w-full border border-border rounded-lg px-2.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="All">All Certifications</option>
                    {certifications.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Min Rating */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Minimum Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="w-full border border-border rounded-lg px-2.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {RATING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle filters */}
              <div className="flex flex-wrap gap-3 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insuredOnly}
                    onChange={(e) => setInsuredOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm text-foreground">Insured Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={licensedOnly}
                    onChange={(e) => setLicensedOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm text-foreground">Licensed Only</span>
                </label>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-red-500 hover:text-red-600 ml-auto"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filterSpecialty !== "All" && (
              <FilterChip label={filterSpecialty} onRemove={() => setFilterSpecialty("All")} />
            )}
            {filterCert !== "All" && (
              <FilterChip label={filterCert} onRemove={() => setFilterCert("All")} />
            )}
            {minRating > 0 && (
              <FilterChip label={`${minRating}+ stars`} onRemove={() => setMinRating(0)} />
            )}
            {insuredOnly && (
              <FilterChip label="Insured" onRemove={() => setInsuredOnly(false)} />
            )}
            {licensedOnly && (
              <FilterChip label="Licensed" onRemove={() => setLicensedOnly(false)} />
            )}
            <button onClick={clearFilters} className="text-xs text-red-500 hover:underline ml-1">
              Clear all
            </button>
          </div>
        )}

        {/* Where to search from */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Search near</span>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setOriginMode("boat")}
              disabled={!boatOrigin}
              title={boatOrigin ? undefined : "Add your boat's home port in My Boats"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
                originMode === "boat" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              {primary?.name && !demo ? primary.name : "My boat"}
            </button>
            <button
              type="button"
              onClick={chooseMe}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                originMode === "me" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
              Me
            </button>
          </div>
          {originMode === "me" && locationError && (
            <span className="text-xs text-amber-700">
              {locationError}{" "}
              <button type="button" onClick={locate} className="font-semibold underline">Try again</button>
            </span>
          )}
          {originMode === "boat" && !boatOrigin && !demo && (
            <span className="text-xs text-muted-foreground">
              No home port on file yet.{" "}
              <button type="button" onClick={() => navigate("/my-boats")} className="font-semibold text-primary hover:underline">Add one</button>
              {" "}or search near you.
            </span>
          )}
        </div>

        {/* Results count + view toggle */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1 min-w-0">
            {vendors.length} shop{vendors.length !== 1 ? "s" : ""}
            {origin && (
              <>
                {" "}within{" "}
                <select
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="inline-block rounded-md border border-border bg-white px-1.5 py-0.5 text-xs font-medium text-foreground max-md:!text-sm"
                  aria-label="Search radius"
                >
                  {[20, 50, 100].map((m) => <option key={m} value={m}>{m} mi</option>)}
                  <option value={Infinity}>any distance</option>
                </select>
              </>
            )}
            {search && <span> for &ldquo;{search}&rdquo;</span>}
          </p>
          <div className="flex items-center bg-muted rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === "list" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === "map" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Map
            </button>
          </div>
        </div>

        {/* Map view */}
        {viewMode === "map" && (
          <div className="mb-4">
            <SectionBoundary
              fallback={
                <div className="flex items-center justify-center bg-muted/30 rounded-xl border border-border h-[450px]">
                  <p className="text-sm text-muted-foreground">The map couldn't load. The list below still works.</p>
                </div>
              }
            >
              <Suspense fallback={
                <div className="flex items-center justify-center bg-muted/30 rounded-xl border border-border h-[450px]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Loading map…
                  </div>
                </div>
              }>
                <VendorMap
                  vendors={vendors}
                  center={origin ?? undefined}
                  centerLabel={originMode === "me" ? "You" : "Your boat"}
                  radiusMiles={radiusMiles === Infinity ? undefined : radiusMiles}
                  onBoundsChange={setMapBounds}
                  onVendorClick={(name) => {
                    const match = allVendors.find((v) => v.name === name);
                    navigate(`/vendor/${encodeURIComponent(match?.id ?? name)}`);
                  }}
                  height="450px"
                />
              </Suspense>
            </SectionBoundary>
          </div>
        )}

        {/* Vendor cards */}
        {vendors.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            {allVendors.length === 0 ? (
              <>
                <p className="text-sm font-medium text-foreground mb-1">No shops on Bosun near you yet</p>
                <p className="text-xs text-muted-foreground mb-3 max-w-sm mx-auto">
                  We're signing up shops in your area. Post a job anyway: shops are notified as they join, and you'll see their bids here.
                </p>
                <button onClick={() => navigate("/app")} className="text-xs font-semibold text-primary hover:underline">
                  Post a job
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground mb-1">No shops match</p>
                <p className="text-xs text-muted-foreground mb-3">Try adjusting your search or filters</p>
                <button onClick={clearFilters} className="text-xs font-semibold text-primary hover:underline">
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={viewMode === "map" ? "space-y-2" : "space-y-3"}>
            {vendors.map((vendor) => (
              <VendorCard key={vendor.name} vendor={vendor} navigate={navigate} miles={milesTo(vendor)} />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-primary/70">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function VendorCard({ vendor, navigate, miles }: { vendor: VendorProfile; navigate: (path: string) => void; miles: number | null }) {
  const pastWork = VENDOR_PAST_PROJECTS[vendor.name] ?? [];

  return (
    <div
      className="bg-white border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`/vendor/${encodeURIComponent((vendor as VendorProfile & { id?: string }).id ?? vendor.name)}`)}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:bg-primary/15 transition-colors">
          {vendor.initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {vendor.name}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-3 h-3 ${star <= Math.round(vendor.rating) ? "text-amber-400" : "text-gray-200"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d={STAR_PATH} />
                  </svg>
                ))}
                <span className="text-xs text-muted-foreground ml-0.5">
                  {vendor.rating} ({vendor.reviewCount.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {vendor.insured && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Insured
                </span>
              )}
              {vendor.licensed && (
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  Licensed
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Responds {vendor.responseTime}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {vendor.completedJobs.toLocaleString()} jobs
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
              {vendor.yearsInBusiness} yrs in business
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {miles != null ? `${formatMiles(miles)} away` : vendor.serviceArea.split("·")[0].trim()}
            </span>
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {vendor.specialties.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
            {vendor.specialties.length > 4 && (
              <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                +{vendor.specialties.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {pastWork.length} past project{pastWork.length !== 1 ? "s" : ""} on Bosun
        </span>
        <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
          View profile
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
