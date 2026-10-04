import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { useMyVendorProfile } from "@/hooks/use-supabase";
import { getLocalProjectStatus } from "@/data/bidUtils";
import { useOpenRfps, useSubmitMarketplaceBid, useVendorBidProjects } from "@/hooks/use-marketplace";
import { toast } from "sonner";
import { isDemoMode } from "@/lib/demoMode";
import { VENDOR_PROFILES } from "@/data/vendorData";
import { useSendMessage } from "@/hooks/use-supabase";
import { Shield, Anchor, MapPin } from "lucide-react";
import TodayPanel from "@/components/shop/TodayPanel";
import { useShopSettings, useWorkOrders } from "@/hooks/use-shop";
import { DEFAULT_SHOP_SETTINGS } from "@/data/shopDemoData";
import { openSlots, rfpFit, type RfpFit } from "@shared/shop";
// Insurance + Templates moved to Business Hub

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM: LineItem = { description: "", quantity: "1", unitPrice: "" };

function lineTotal(item: LineItem): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

function bidTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}


export default function VendorDashboard() {
  const { vendorId } = useRole();
  const navigate = useNavigate();


  // Detail panel state
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionSent, setQuestionSent] = useState(false);

  // Bid dialog state
  const [dialogProjectId, setDialogProjectId] = useState<string | null>(null);
  const [bidMessage, setBidMessage] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [bidExpiry, setBidExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  // Filter state
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [locationFilters, setLocationFilters] = useState<Set<string>>(new Set());

  function toggleCategory(cat: string) {
    if (cat === "All") { setCategoryFilters(new Set()); return; }
    setCategoryFilters(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function toggleLocation(loc: string) {
    if (loc === "All") { setLocationFilters(new Set()); return; }
    setLocationFilters(prev => {
      const next = new Set(prev);
      next.has(loc) ? next.delete(loc) : next.add(loc);
      return next;
    });
  }

  const { data: myVendor } = useMyVendorProfile();
  const vendorRow = myVendor as { business_name?: string; response_time?: string | null; insurance_expiry?: string | null } | null | undefined;
  const demoVendor = isDemoMode() && vendorId ? VENDOR_PROFILES[vendorId] : null;
  const vendor = demoVendor
    ? {
        name: demoVendor.name,
        responseTime: demoVendor.responseTime,
      }
    : vendorRow
      ? {
          name: vendorRow.business_name ?? "Your shop",
          responseTime: vendorRow.response_time ?? "—",
        }
      : vendorId
        ? { name: "Your shop", responseTime: "—" }
        : null;

  const { data: allProjects = [] } = useOpenRfps();
  const { data: vendorProjects = [], refetch } = useVendorBidProjects(vendorId);
  const submitBid = useSubmitMarketplaceBid();
  const sendMessage = useSendMessage();

  // Declined RFPs (vendor dismissed)
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem(`vendor_declined_rfps_${vendorId}`) ?? "[]");
      return new Set(ids);
    } catch { return new Set(); }
  });

  function declineRFP(projectId: string) {
    setDeclinedIds((prev) => {
      const next = new Set(prev);
      next.add(projectId);
      localStorage.setItem(`vendor_declined_rfps_${vendorId}`, JSON.stringify([...next]));
      return next;
    });
  }

  const openRFPs = allProjects.filter((p) => {
    const effective = getLocalProjectStatus(p.id, p.status);
    if (effective !== "gathering" && effective !== "bidding") return false;
    // Hide already-bid
    if (vendorProjects.some((vp) => vp.id === p.id)) return false;
    if (submitted.includes(p.id)) return false;
    // Hide declined
    if (declinedIds.has(p.id)) return false;
    return true;
  });

  const locations = useMemo(() => {
    const locs = new Set(openRFPs.map((p) => p.location ?? "Fort Lauderdale"));
    return ["All", ...Array.from(locs).sort()];
  }, [openRFPs]);

  const categories = useMemo(() => {
    const cats = new Set(openRFPs.map((p) => p.category ?? "Other"));
    return ["All", ...Array.from(cats).sort()];
  }, [openRFPs]);

  // New jobs framed as filling open slots on the shop's own schedule.
  const { data: shopOrders = [] } = useWorkOrders(vendorId);
  const { data: shopSettings = DEFAULT_SHOP_SETTINGS } = useShopSettings(vendorId);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const fits = useMemo(() => {
    const slots = openSlots(shopOrders, shopSettings.bays.length ? shopSettings.bays : ["Shop"]);
    const m = new Map<string, RfpFit>();
    for (const p of openRFPs) m.set(p.id, rfpFit(p, shopOrders, slots));
    return m;
  }, [openRFPs, shopOrders, shopSettings.bays]);

  const filteredRFPs = useMemo(() => {
    return openRFPs.filter((p) => {
      const loc = p.location ?? "Fort Lauderdale";
      const cat = p.category ?? "Other";
      if (locationFilters.size > 0 && !locationFilters.has(loc)) return false;
      if (categoryFilters.size > 0 && !categoryFilters.has(cat)) return false;
      return true;
    }).sort((a, b) => (fits.get(b.id)?.score ?? 0) - (fits.get(a.id)?.score ?? 0));
  }, [openRFPs, locationFilters, categoryFilters, fits]);
  const shownRFPs = showAllJobs ? filteredRFPs : filteredRFPs.slice(0, 3);

  const detailProject = detailProjectId
    ? allProjects.find((p) => p.id === detailProjectId)
    : null;

  const dialogProject = dialogProjectId
    ? allProjects.find((p) => p.id === dialogProjectId)
    : null;

  function openDetail(projectId: string) {
    setDetailProjectId(projectId);
    setQuestionText("");
    setQuestionSent(false);
  }

  function closeDetail() {
    setDetailProjectId(null);
  }

  async function sendQuestion() {
    if (!questionText.trim() || !detailProject) return;
    if (!detailProject.ownerId) {
      toast.error("Submit a bid first so the owner can reply in Inbox.");
      return;
    }
    try {
      const existingBid = detailProject.bids.find((b) => b.vendorProfileId === vendorId || b.vendorName === vendorId);
      await sendMessage.mutateAsync({
        bid_id: existingBid?.id,
        recipient_id: detailProject.ownerId,
        text: questionText.trim(),
      });
      setQuestionText("");
      setQuestionSent(true);
      setTimeout(() => setQuestionSent(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    }
  }

  const total = bidTotal(lineItems);
  const isValid =
    !!dialogProject &&
    !!vendorId &&
    bidMessage.trim().length > 0 &&
    lineItems.some((item) => item.description.trim() && parseFloat(item.unitPrice) > 0);

  function openDialog(projectId: string) {
    setDialogProjectId(projectId);
    setBidMessage("");
    setLineItems([{ ...EMPTY_ITEM }]);
    setBidExpiry("");
  }

  function closeDialog() {
    setDialogProjectId(null);
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setLineItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!isValid || !dialogProject || !vendorId) return;
    setSubmitting(true);
    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    );
    try {
      await submitBid.mutateAsync({
        projectId: dialogProject.id,
        vendorProfileId: vendorId,
        price: total,
        message: bidMessage.trim(),
        expiryDate: bidExpiry || undefined,
        lineItems: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      });
      setSubmitted((prev) => [...prev, dialogProject.id]);
      closeDialog();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit bid.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-32">
          <p className="text-muted-foreground text-sm">No vendor profile selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-16 md:pb-0">
      <Header />

      {/* ── Today ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground">
              {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"},{" "}
              {vendor.name.split(" ")[0]}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/vendor-shop?tab=orders&new=wo")}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-foreground text-background"
            >
              + Work order
            </button>
            <button
              onClick={() => navigate("/vendor-shop?tab=parts&paste=1")}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted"
            >
              Track a part
            </button>
            <button
              onClick={() => navigate("/vendor-shop?tab=schedule")}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {vendorId && <TodayPanel vendorId={vendorId} coiExpiry={vendorRow?.insurance_expiry ?? null} />}

        <div className="mt-8" />
        {/* ── Open RFPs ────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">New jobs near you</h2>
            <p className="text-[11px] text-muted-foreground">Ranked by what fits your open days and the work you already do</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredRFPs.length}{filteredRFPs.length !== openRFPs.length ? ` of ${openRFPs.length}` : ""} job{filteredRFPs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters (only when browsing everything) */}
        {showAllJobs && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-14 flex-shrink-0">Service</span>
            <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
              <div className="flex gap-1.5 w-max">
                {categories.map((cat) => {
                  const isAll = cat === "All";
                  const active = isAll ? categoryFilters.size === 0 : categoryFilters.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                        active
                          ? "bg-sky-100 text-sky-700 font-medium"
                          : "bg-white border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-14 flex-shrink-0">Location</span>
            <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
              <div className="flex gap-1.5 w-max">
                {locations.map((loc) => {
                  const isAll = loc === "All";
                  const active = isAll ? locationFilters.size === 0 : locationFilters.has(loc);
                  return (
                    <button
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                        active
                          ? "bg-sky-100 text-sky-700 font-medium"
                          : "bg-white border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        )}

        {/* RFP cards */}
        {filteredRFPs.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <p className="text-sm text-muted-foreground">No projects match the selected filters.</p>
            <button
              onClick={() => { setCategoryFilters(new Set()); setLocationFilters(new Set()); }}
              className="mt-2 text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shownRFPs.map((project) => {
              const fit = fits.get(project.id);
              return (
                <div
                  key={project.id}
                  onClick={() => openDetail(project.id)}
                  className="bg-white border rounded-xl p-4 sm:p-5 transition-all cursor-pointer border-border hover:border-sky-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{project.title}</h3>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          project.status === "gathering"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-sky-50 text-sky-700"
                        }`}>
                          {project.status === "gathering" ? "Gathering" : "Accepting bids"}
                        </span>
                        {project.category && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground whitespace-nowrap">
                            {project.category}
                          </span>
                        )}
                        {project.marinaCOIRequired && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            <Shield className="w-3 h-3" />
                            COI Required
                          </span>
                        )}
                        {project.haulOutRequired && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            <Anchor className="w-3 h-3" />
                            Haul-Out
                          </span>
                        )}
                        {project.workLocation && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200 whitespace-nowrap">
                            <MapPin className="w-3 h-3" />
                            {project.workLocation === "at_marina" ? "At Marina" : project.workLocation === "vendor_facility" ? "Vendor Facility" : "Mobile"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); declineRFP(project.id); }}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                        title="Decline this RFP"
                      >
                        Not Interested
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDialog(project.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-sky-500 text-white text-xs sm:text-sm font-bold hover:bg-sky-600 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                      >
                        Bid Now
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mb-1.5">
                    <span>{project.date}</span>
                    {project.location && (
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {project.location}
                      </span>
                    )}
                  </div>

                  {fit && (fit.slot || fit.pastJobs > 0) && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {fit.slot && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Fits {new Date(`${fit.slot.day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {fit.slot.bay}
                        </span>
                      )}
                      {fit.pastJobs > 0 && (
                        <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">
                          You've done {fit.pastJobs} of these
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-foreground leading-relaxed line-clamp-2 mb-2">
                    {project.description}
                  </p>

                  {project.boat && (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
                      </svg>
                      <span className="font-medium text-foreground">"{project.boat.name}"</span>
                      <span className="text-border">·</span>
                      <span>{project.boat.year} {project.boat.make} {project.boat.model}</span>
                      <span className="text-border hidden sm:inline">·</span>
                      <span className="hidden sm:inline">{project.boat.propulsion}</span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-1.5">
                    {project.bids.length} bid{project.bids.length !== 1 ? "s" : ""} submitted
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {filteredRFPs.length > 3 || showAllJobs ? (
          <div className="mt-3 text-center">
            <button
              onClick={() => setShowAllJobs((v) => !v)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 border border-border bg-white rounded-lg px-3 py-2"
            >
              {showAllJobs ? "Show top matches only" : `Browse all ${openRFPs.length} open jobs`}
            </button>
          </div>
        ) : null}
      </main>

      {/* ── RFP Detail Panel ───────────────────────────────────── */}
      {detailProject && (() => {
        const alreadyBid =
          submitted.includes(detailProject.id) ||
          vendorProjects.some((vp) => vp.id === detailProject.id);
        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDetail} />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-foreground leading-snug">{detailProject.title}</h2>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          detailProject.status === "gathering" ? "bg-blue-50 text-blue-700" : "bg-sky-50 text-sky-700"
                        }`}>
                          {detailProject.status === "gathering" ? "Gathering Candidates" : "Accepting Bids"}
                        </span>
                        {detailProject.category && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground whitespace-nowrap">
                            {detailProject.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={closeDetail} className="p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {detailProject.date}
                    </span>
                    {detailProject.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {detailProject.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {detailProject.bids.length} bid{detailProject.bids.length !== 1 ? "s" : ""} submitted
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Project Description</h3>
                    <p className="text-sm text-foreground leading-relaxed">{detailProject.description}</p>
                  </div>

                  {detailProject.boat && (
                    <div className="bg-muted/40 rounded-lg px-4 py-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vessel</h3>
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
                        </svg>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">"{detailProject.boat.name}"</p>
                          <p className="text-sm text-foreground">{detailProject.boat.year} {detailProject.boat.make} {detailProject.boat.model}</p>
                          <p className="text-xs text-muted-foreground">{detailProject.boat.propulsion}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailProject.photos && detailProject.photos.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photos</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {detailProject.photos.map((src, i) => (
                          <img key={i} src={src} alt={`Project photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg bg-muted" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-1">Ask the owner a question</h3>
                    <p className="text-xs text-muted-foreground mb-2">Need more info before bidding? Send a message — they'll reply in the thread.</p>
                    {questionSent ? (
                      <div className="flex items-center gap-2 py-3 px-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Message sent! The owner will follow up soon.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          rows={3}
                          placeholder="e.g. What's the current condition of the engine? Are there any existing issues I should know about?"
                          className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50 resize-none"
                        />
                        <button
                          onClick={sendQuestion}
                          disabled={!questionText.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-sky-300 text-sky-700 text-sm font-medium hover:bg-sky-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Message
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-3">
                  <button
                    onClick={closeDetail}
                    className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                  {alreadyBid ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Bid Submitted
                    </div>
                  ) : (
                    <button
                      onClick={() => { closeDetail(); openDialog(detailProject.id); }}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition-colors shadow-sm"
                    >
                      Bid Now
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Submit Bid Dialog ──────────────────────────────────── */}
      {dialogProject && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDialog} />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">

              <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">Submit a Bid</h2>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{dialogProject.title}</p>
                    {dialogProject.boat && (
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
                        </svg>
                        <span className="font-medium text-foreground">"{dialogProject.boat.name}"</span>
                        <span>·</span>
                        <span>{dialogProject.boat.year} {dialogProject.boat.make} {dialogProject.boat.model}</span>
                        <span className="hidden sm:inline">· {dialogProject.boat.propulsion}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={closeDialog} className="p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Cover message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    rows={3}
                    placeholder="Introduce yourself, describe your qualifications, and explain why you're a great fit…"
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Itemized estimate <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-muted-foreground hidden sm:block">Break down your costs</span>
                  </div>

                  <div className="grid gap-2 mb-1.5 pr-7" style={{ gridTemplateColumns: "1fr 48px 90px 64px" }}>
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Qty</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Unit $</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Total</span>
                  </div>

                  <div className="space-y-2">
                    {lineItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="grid gap-1.5 flex-1" style={{ gridTemplateColumns: "1fr 48px 90px 64px" }}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder="Labor, Parts…"
                            className="border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          />
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, "quantity", e.target.value)}
                            className="border border-border rounded-md px-1.5 py-1.5 text-sm text-center text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-border rounded-md pl-5 pr-1.5 py-1.5 text-sm text-right text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <span className="text-sm font-medium text-foreground">
                              {lineTotal(item) > 0
                                ? `$${lineTotal(item).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(i)}
                          disabled={lineItems.length === 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
                          aria-label="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add line item
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground">
                        {total > 0
                          ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "$—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Bid valid until
                  </label>
                  <input
                    type="text"
                    value={bidExpiry}
                    onChange={(e) => setBidExpiry(e.target.value)}
                    placeholder="e.g. Mar 25, 2026"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {total > 0 && (
                    <p className="text-sm text-muted-foreground truncate">
                      Total: <span className="font-bold text-foreground">${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={closeDialog}
                    className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !isValid}
                    className="px-5 py-2 rounded-md bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {submitting ? "Submitting…" : "Submit Bid"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
