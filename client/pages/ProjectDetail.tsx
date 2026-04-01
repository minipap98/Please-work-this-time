import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ReviewForm from "@/components/ReviewForm";
import StripePayment from "@/components/StripePayment";
import { VENDOR_PAST_PROJECTS } from "@/data/projectData";
import { getAugmentedProjects, getRejectedBidIds, rejectBid, unrejectBid, getBidAdjustment, getRescindedBidIds } from "@/data/bidUtils";
import { VENDOR_PROFILES } from "@/data/vendorData";
import { useRole } from "@/context/RoleContext";
import { getProjectPhotos } from "@/lib/photoUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STAR_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Stars({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
      <span className="text-xs text-muted-foreground ml-0.5">
        {rating} ({reviewCount.toLocaleString()})
      </span>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, vendorId } = useRole();

  const project = getAugmentedProjects().find((p) => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-muted-foreground">Project not found.</p>
        </main>
      </div>
    );
  }

  const chosenBid = project.chosenBidId
    ? project.bids.find((b) => b.id === project.chosenBidId)
    : null;

  const invoiceTotal = project.invoice
    ? project.invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : 0;

  const [expandedBid, setExpandedBid] = useState<string | null>(null);
  const [rejectedIds, setRejectedIds] = useState<string[]>(() => getRejectedBidIds());
  const [rescindedIds] = useState<string[]>(() => getRescindedBidIds());

  function handleRejectBid(bidId: string) {
    rejectBid(bidId);
    setRejectedIds(getRejectedBidIds());
  }

  function handleUnrejectBid(bidId: string) {
    unrejectBid(bidId);
    setRejectedIds(getRejectedBidIds());
  }

  // Service window dialog
  const [serviceDialogBidId, setServiceDialogBidId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [serviceNotes, setServiceNotes] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`booking_${id}`) ?? "null"); } catch { return null; }
  });

  const serviceDialogBid = serviceDialogBidId
    ? project.bids.find((b) => b.id === serviceDialogBidId)
    : null;

  // Generate next 6 week options starting from next Monday
  const weekOptions = (() => {
    const options: { label: string; sublabel: string; index: number }[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    for (let i = 0; i < 6; i++) {
      const start = new Date(nextMonday);
      start.setDate(nextMonday.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      const fmt = (d: Date) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      options.push({
        index: i,
        label: fmt(start) + " – " + fmt(end),
        sublabel: i === 0 ? "Next week" : i === 1 ? "In 2 weeks" : `In ${i + 1} weeks`,
      });
    }
    return options;
  })();

  const TIME_OPTIONS = [
    { id: "morning", label: "Morning", sub: "8 am – 12 pm" },
    { id: "afternoon", label: "Afternoon", sub: "12 pm – 5 pm" },
    { id: "flexible", label: "Flexible", sub: "Either works" },
  ];

  function handleAcceptBid(bidId: string) {
    setServiceDialogBidId(bidId);
    setSelectedWeek(null);
    setSelectedTime(null);
    setServiceNotes("");
  }

  function handleConfirmBooking() {
    if (selectedWeek === null || !selectedTime) return;
    const booking = {
      bidId: serviceDialogBidId,
      vendorName: serviceDialogBid?.vendorName,
      week: weekOptions[selectedWeek].label,
      time: TIME_OPTIONS.find((t) => t.id === selectedTime)?.label,
      notes: serviceNotes,
    };
    localStorage.setItem(`booking_${id}`, JSON.stringify(booking));
    setBookingConfirmed(booking);
    setServiceDialogBidId(null);
  }

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Additional notes & photos (owner can add after posting)
  const notesKey = `project_notes_${id}`;
  const photosKey = `project_extra_photos_${id}`;
  const [additionalNotes, setAdditionalNotes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(notesKey) ?? "[]"); } catch { return []; }
  });
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(photosKey) ?? "[]"); } catch { return []; }
  });
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  function handleAddNote() {
    if (!newNoteText.trim()) return;
    const timestamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    const entry = `[${timestamp}] ${newNoteText.trim()}`;
    const updated = [...additionalNotes, entry];
    setAdditionalNotes(updated);
    localStorage.setItem(notesKey, JSON.stringify(updated));
    setNewNoteText("");
    setShowAddNote(false);
  }

  function handleDeleteNote(index: number) {
    const updated = additionalNotes.filter((_, i) => i !== index);
    setAdditionalNotes(updated);
    localStorage.setItem(notesKey, JSON.stringify(updated));
  }

  function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) return; // 10MB limit
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setAdditionalPhotos((prev) => {
            const updated = [...prev, ev.target!.result as string];
            localStorage.setItem(photosKey, JSON.stringify(updated));
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function handleDeletePhoto(index: number) {
    const updated = additionalPhotos.filter((_, i) => i !== index);
    setAdditionalPhotos(updated);
    localStorage.setItem(photosKey, JSON.stringify(updated));
  }

  // Payment/deposit state
  const depositKey = `deposit_${id}`;
  const [depositPaid, setDepositPaid] = useState(() => {
    try { return JSON.parse(localStorage.getItem(depositKey) ?? "null"); } catch { return null; }
  });
  const [paymentModal, setPaymentModal] = useState<{ amount: number; label: string } | null>(null);

  // Project status progression (stored locally for demo)
  const statusKey = `project_status_${id}`;
  const [projectStatus, setProjectStatus] = useState<string>(() => {
    try { return localStorage.getItem(statusKey) ?? project.status; } catch { return project.status; }
  });

  function advanceStatus() {
    const next = projectStatus === "active" ? "in-progress" : projectStatus === "in-progress" ? "completed" : "completed";
    localStorage.setItem(statusKey, next);
    setProjectStatus(next);
  }

  function daysUntil(dateStr: string) {
    const parts = dateStr.split(" ");
    const parsed = new Date(`${parts[0]} ${parts[1]}, ${parts[2]}`);
    const diff = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }


  const allPhotos = useMemo(() => [...(project.photos ?? []), ...getProjectPhotos(project.id)], [project]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

        {/* Project header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl font-semibold text-foreground">{project.title}</h1>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded flex-shrink-0 capitalize ${
                projectStatus === "active"
                  ? "bg-primary text-white"
                  : projectStatus === "in-progress"
                  ? "bg-amber-500 text-white"
                  : "bg-muted text-foreground"
              }`}
            >
              {projectStatus === "in-progress" ? "In Progress" : projectStatus}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{project.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Posted {project.date} &middot; {project.bids.length} bid
            {project.bids.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Status progression */}
        <div className="mb-10 border border-border rounded-lg px-5 py-4">
          <div className="flex items-center justify-between relative">
            {/* Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-border mx-5" />
            {[
              { key: "active", label: "Bids Received" },
              { key: "in-progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
            ].map((step, i) => {
              const steps = ["active", "in-progress", "completed"];
              const currentIdx = steps.indexOf(projectStatus);
              const stepIdx = steps.indexOf(step.key);
              const isDone = stepIdx <= currentIdx;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isDone ? "bg-primary border-primary text-white" : "bg-white border-border text-muted-foreground"}`}>
                    {isDone ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {projectStatus !== "completed" && bookingConfirmed && (
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {projectStatus === "active" ? "Vendor accepted — waiting to begin work" : "Work is underway"}
              </p>
              <button
                onClick={advanceStatus}
                className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
              >
                {projectStatus === "active" ? "Mark as In Progress →" : "Mark as Completed →"}
              </button>
            </div>
          )}
        </div>

        {/* Additional Notes & Photos */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Notes & Photos</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity cursor-pointer">
                + Photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddPhotos}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
              >
                {showAddNote ? "Cancel" : "+ Note"}
              </button>
            </div>
          </div>

          {/* Add note form */}
          {showAddNote && (
            <div className="border border-dashed border-primary/30 rounded-lg p-3 mb-3">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add a note for vendors — additional details, schedule changes, clarifications…"
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none mb-2"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteText.trim()}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Add Note
              </button>
            </div>
          )}

          {/* Photos grid */}
          {(allPhotos.length > 0 || additionalPhotos.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {allPhotos.map((src, i) => (
                <div key={`orig-${i}`} className="relative">
                  <img
                    src={src}
                    className="w-20 h-20 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setLightboxIndex(i)}
                  />
                </div>
              ))}
              {additionalPhotos.map((src, i) => (
                <div key={`extra-${i}`} className="relative group">
                  <img
                    src={src}
                    className="w-20 h-20 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setLightboxIndex(allPhotos.length + i)}
                  />
                  <button
                    onClick={() => handleDeletePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notes list */}
          {additionalNotes.length > 0 ? (
            <div className="space-y-2">
              {additionalNotes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/30 group">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-xs text-foreground flex-1 leading-relaxed">{note}</p>
                  <button
                    onClick={() => handleDeleteNote(i)}
                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !showAddNote && allPhotos.length === 0 && additionalPhotos.length === 0 && (
              <p className="text-xs text-muted-foreground">No additional notes or photos yet. Add details to help vendors give better bids.</p>
            )
          )}
        </section>

        {/* Equipment & Warranty */}
        {project.linkedEquipment && (() => {
          const eq = project.linkedEquipment;
          const isAcceptedVendor =
            role === "vendor" &&
            vendorId != null &&
            project.chosenBidId != null &&
            project.bids.some(
              (b) => b.id === project.chosenBidId && b.vendorName === vendorId
            );
          const isVendor = role === "vendor";

          const warrantyBadge = (() => {
            const s = eq.warrantyStatus.toLowerCase();
            if (s === "active")
              return { label: "Active", icon: "\u2705", classes: "bg-green-50 text-green-700 border-green-200" };
            if (s.includes("expiring"))
              return { label: "Expiring Soon", icon: "\u26A0\uFE0F", classes: "bg-amber-50 text-amber-700 border-amber-200" };
            return { label: "Expired", icon: "\u274C", classes: "bg-red-50 text-red-700 border-red-200" };
          })();

          const showWarrantyClaim =
            project.isWarrantyClaim === true &&
            (eq.warrantyStatus.toLowerCase() === "active" ||
              eq.warrantyStatus.toLowerCase().includes("expiring"));

          return (
            <section className="mb-10">
              <h2 className="text-base font-semibold text-foreground mb-4">Equipment &amp; Warranty</h2>
              <div className="border border-border rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{eq.category}</p>
                    <p className="text-sm font-semibold text-foreground">{eq.manufacturer} {eq.model}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${warrantyBadge.classes}`}>
                      {warrantyBadge.icon} {warrantyBadge.label}
                    </span>
                    {showWarrantyClaim && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        Potential Warranty Claim
                      </span>
                    )}
                  </div>
                </div>

                {isAcceptedVendor ? (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Serial Number</p>
                        <p className="font-medium text-foreground">{eq.serialNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dealer</p>
                        <p className="font-medium text-foreground">{eq.dealer}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Warranty Expiry</p>
                        <p className="font-medium text-foreground">{eq.warrantyExpiry}</p>
                      </div>
                    </div>
                    {showWarrantyClaim && (
                      <button
                        onClick={() => {
                          const claims = JSON.parse(localStorage.getItem("bosun_vendor_warranty_claims") || "[]");
                          const newClaim = {
                            id: `wc_${Date.now()}`,
                            projectId: project.id,
                            projectTitle: project.title,
                            ownerName: project.owner || "Boat Owner",
                            equipmentManufacturer: eq.manufacturer,
                            equipmentModel: eq.model,
                            serialNumber: eq.serialNumber,
                            status: "submitted" as const,
                            submittedDate: new Date().toISOString().split("T")[0],
                            lastUpdated: new Date().toISOString().split("T")[0],
                            notes: "",
                            claimAmount: 0,
                          };
                          claims.push(newClaim);
                          localStorage.setItem("bosun_vendor_warranty_claims", JSON.stringify(claims));
                          alert("Warranty claim filed successfully.");
                        }}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        File Warranty Claim
                      </button>
                    )}
                  </div>
                ) : isVendor ? (
                  <p className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground italic">
                    Full equipment details available after bid acceptance
                  </p>
                ) : null}
              </div>
            </section>
          );
        })()}

        {/* Bids */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">
            {project.status === "completed" ? "All Bids" : "Bids Received"}
          </h2>

          <div className="space-y-4">
            {project.bids.map((bid) => {
              const isChosen = bid.id === project.chosenBidId;
              const isRejected = rejectedIds.includes(bid.id);
              const isRescinded = rescindedIds.includes(bid.id);
              const canAct = (project.status === "active" || project.status === "bidding") && !isChosen && !isRescinded;
              const bidAdj = getBidAdjustment(bid.id);
              const displayPrice = bidAdj?.price ?? bid.price;
              const displayMessage = bidAdj?.message || bid.message;
              return (
                <div
                  key={bid.id}
                  className={`border rounded-lg p-5 transition-colors ${
                    isChosen
                      ? "border-primary bg-primary/5"
                      : isRescinded
                      ? "border-border bg-zinc-50 opacity-50"
                      : isRejected
                      ? "border-border bg-muted/30 opacity-60"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: avatar + vendor info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isRejected ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                        {bid.vendorInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => navigate(`/vendor/${encodeURIComponent(bid.vendorName)}`)}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {bid.vendorName}
                          </button>
                          {isChosen && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Chosen
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              Declined
                            </span>
                          )}
                          {isRescinded && (
                            <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                              Withdrawn
                            </span>
                          )}
                          {VENDOR_PROFILES[bid.vendorName]?.insured && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                              Insured
                            </span>
                          )}
                          {VENDOR_PROFILES[bid.vendorName]?.licensed && (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                              Licensed
                            </span>
                          )}
                        </div>
                        <Stars rating={bid.rating} reviewCount={bid.reviewCount} />
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            Submitted {bid.submittedDate}
                          </p>
                          {VENDOR_PROFILES[bid.vendorName]?.responseTime && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Responds {VENDOR_PROFILES[bid.vendorName].responseTime}
                            </p>
                          )}
                          {(() => {
                            const days = daysUntil(bid.expiryDate);
                            if (days <= 0) return <span className="text-xs text-red-500 font-semibold">Expired</span>;
                            if (days <= 5) return <span className="text-xs text-amber-600 font-semibold">Expires in {days}d</span>;
                            return <span className="text-xs text-muted-foreground">Expires {bid.expiryDate}</span>;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right: price + actions */}
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-bold text-foreground">
                          ${displayPrice.toLocaleString()}
                        </span>
                        {bidAdj && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            Revised
                          </span>
                        )}
                      </div>
                      {canAct && !isRejected && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRejectBid(bid.id)}
                            className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptBid(bid.id)}
                            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Accept Bid
                          </button>
                        </div>
                      )}
                      {canAct && isRejected && (
                        <button
                          onClick={() => handleUnrejectBid(bid.id)}
                          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                        >
                          Undo decline
                        </button>
                      )}
                      {bid.thread.length > 0 && (
                        <button
                          onClick={() => navigate("/inbox")}
                          className="flex items-center gap-1 text-xs text-primary font-semibold hover:opacity-70 transition-opacity"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Messages ({bid.thread.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t border-border/50 pt-3">
                    {displayMessage}
                    {bidAdj?.message && bidAdj.message !== bid.message && (
                      <span className="ml-1.5 text-[10px] text-amber-600 font-medium">(updated)</span>
                    )}
                  </p>

                  {/* Itemized estimate */}
                  {bid.lineItems && bid.lineItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground mb-2">Itemized Estimate</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-medium text-muted-foreground border-b border-border/50">
                            <th className="text-left pb-1.5">Description</th>
                            <th className="text-center pb-1.5 w-10">Qty</th>
                            <th className="text-right pb-1.5 w-24">Unit Price</th>
                            <th className="text-right pb-1.5 w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bid.lineItems.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-0">
                              <td className="py-1.5 text-foreground">{item.description}</td>
                              <td className="py-1.5 text-center text-muted-foreground">{item.quantity}</td>
                              <td className="py-1.5 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                              <td className="py-1.5 text-right font-medium text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-foreground">Total</td>
                            <td className="pt-2 text-right font-bold text-foreground">${displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Past work toggle */}
                  {VENDOR_PAST_PROJECTS[bid.vendorName] && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${expandedBid === bid.id ? "rotate-90" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {expandedBid === bid.id ? "Hide" : "View"} past work ({VENDOR_PAST_PROJECTS[bid.vendorName].length})
                      </button>

                      {expandedBid === bid.id && (
                        <div className="mt-4 space-y-4">
                          {VENDOR_PAST_PROJECTS[bid.vendorName].map((project, i) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-4">
                              {/* Project title + date */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm font-semibold text-foreground">{project.title}</p>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{project.completedDate}</span>
                              </div>

                              {/* Boat + engine */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12l4-4m-4 4l4 4" />
                                  </svg>
                                  {project.boatInfo}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {project.engineInfo}
                                </span>
                              </div>

                              {/* Review */}
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 flex gap-0.5 mt-0.5">
                                  {[1,2,3,4,5].map((s) => (
                                    <svg key={s} className={`w-3 h-3 ${s <= project.review.stars ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                      <path d={STAR_PATH} />
                                    </svg>
                                  ))}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                                    "{project.review.comment}"
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">— {project.review.reviewer}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Deposit / Payment — shown when booking is confirmed on active project */}
        {bookingConfirmed && (project.status === "active" || project.status === "bidding") && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-foreground mb-4">Payment</h2>
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{bookingConfirmed.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bookingConfirmed.week} · {bookingConfirmed.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Bid total</p>
                  <p className="text-lg font-bold text-foreground">
                    ${project.bids.find((b) => b.id === bookingConfirmed.bidId)?.price.toLocaleString() ?? "—"}
                  </p>
                </div>
              </div>

              {depositPaid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-green-700">Deposit paid</p>
                    <p className="text-xs text-green-600">${depositPaid.amount} · {depositPaid.date}{depositPaid.method ? ` · ${depositPaid.method}` : ""} · Remaining balance due at completion</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">25% Deposit</p>
                      <p className="font-bold text-foreground">
                        ${Math.round((project.bids.find((b) => b.id === bookingConfirmed.bidId)?.price ?? 0) * 0.25).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Due now to confirm</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Remaining Balance</p>
                      <p className="font-bold text-foreground">
                        ${Math.round((project.bids.find((b) => b.id === bookingConfirmed.bidId)?.price ?? 0) * 0.75).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Due at completion</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const price = project.bids.find((b) => b.id === bookingConfirmed.bidId)?.price ?? 0;
                      setPaymentModal({ amount: Math.round(price * 0.25), label: "25% Deposit" });
                    }}
                    className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Pay 25% Deposit
                  </button>
                  <button
                    onClick={() => {
                      const price = project.bids.find((b) => b.id === bookingConfirmed.bidId)?.price ?? 0;
                      setPaymentModal({ amount: price, label: "Pay in Full" });
                    }}
                    className="w-full px-4 py-2.5 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    Pay in Full
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Rate the vendor — completed projects only */}
        {project.status === "completed" && chosenBid && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-foreground mb-4">Rate Your Experience</h2>
            <ReviewForm
              projectId={project.id}
              vendorId={chosenBid.vendorName}
              vendorName={chosenBid.vendorName}
              vendorInitials={chosenBid.vendorInitials}
            />
          </section>
        )}

        {/* Invoice — completed projects only */}
        {project.status === "completed" && project.invoice && chosenBid && (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-foreground mb-4">Invoice</h2>

            <div className="border border-border rounded-lg overflow-hidden">
              {/* Invoice header bar */}
              <div className="bg-muted/40 px-6 py-4 flex items-start justify-between gap-4 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">{chosenBid.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {project.invoice.invoiceNumber}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-0.5">
                  <p>Issued: {project.invoice.issuedDate}</p>
                  <p className="text-green-600 font-semibold">
                    Paid: {project.invoice.paidDate}
                  </p>
                </div>
              </div>

              {/* Line items table */}
              <div className="px-6 py-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                      <th className="text-left pb-2.5">Description</th>
                      <th className="text-center pb-2.5 w-14">Qty</th>
                      <th className="text-right pb-2.5 w-28">Unit Price</th>
                      <th className="text-right pb-2.5 w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-3 text-foreground">{item.description}</td>
                        <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="py-3 text-right text-muted-foreground">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-medium text-foreground">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td colSpan={3} className="pt-4 text-right text-sm font-semibold text-foreground">
                        Total
                      </td>
                      <td className="pt-4 text-right text-lg font-bold text-foreground">
                        ${invoiceTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Download button */}
              <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Job Photos — completed projects only */}
        {project.status === "completed" && allPhotos.length > 0 && (
          <section className="mt-12">
            <h3 className="text-sm font-semibold text-foreground mb-3">Job Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPhotos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`Job photo ${i + 1}`}
                  className="rounded-lg object-cover aspect-square w-full border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Booking confirmed banner */}
      {bookingConfirmed && (project.status === "active" || project.status === "bidding") && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Bid accepted · {bookingConfirmed.week} · {bookingConfirmed.time}
        </div>
      )}

      {/* Service window dialog */}
      <Dialog
        open={!!serviceDialogBidId}
        onOpenChange={(v) => !v && setServiceDialogBidId(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Service Window</DialogTitle>
            <DialogDescription>
              {serviceDialogBid && (
                <>
                  You're accepting{" "}
                  <span className="font-semibold text-foreground">
                    {serviceDialogBid.vendorName}
                  </span>
                  's bid of{" "}
                  <span className="font-semibold text-foreground">
                    ${serviceDialogBid.price.toLocaleString()}
                  </span>
                  . Choose a week and time that works for you.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-1">
            {/* Week selection */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Preferred Week</p>
              <div className="grid grid-cols-2 gap-2">
                {weekOptions.map((w) => (
                  <button
                    key={w.index}
                    onClick={() => setSelectedWeek(w.index)}
                    className={`text-left p-3 rounded-md border transition-colors ${
                      selectedWeek === w.index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{w.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.sublabel}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time of day */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Time of Day</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTime(t.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors text-center ${
                      selectedTime === t.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary hover:bg-primary/5 text-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Notes for the Vendor{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                placeholder="e.g. Boat is at slip 14B, gate code is 1234…"
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setServiceDialogBidId(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedWeek === null || !selectedTime}
                onClick={handleConfirmBooking}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo lightbox */}
      {lightboxIndex !== null && allPhotos.length > 0 && (
        <>
          <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setLightboxIndex(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-3xl w-full">
              <img src={allPhotos[lightboxIndex]} className="w-full rounded-lg" alt="" />
              <button
                onClick={() => setLightboxIndex(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              >
                ×
              </button>
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + allPhotos.length) % allPhotos.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 text-lg"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % allPhotos.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 text-lg"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Stripe Payment Modal */}
      {paymentModal && bookingConfirmed && (
        <StripePayment
          amount={paymentModal.amount}
          label={paymentModal.label}
          vendorName={bookingConfirmed.vendorName}
          projectTitle={project.title}
          onSuccess={(info) => {
            localStorage.setItem(depositKey, JSON.stringify(info));
            setDepositPaid(info);
            setPaymentModal(null);
          }}
          onCancel={() => setPaymentModal(null)}
        />
      )}
    </div>
  );
}
