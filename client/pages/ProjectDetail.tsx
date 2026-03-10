import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { PROJECTS, VENDOR_PAST_PROJECTS } from "@/data/projectData";
import { VENDOR_PROFILES } from "@/data/vendorData";
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

function StarPicker({
  value,
  hover,
  onHover,
  onLeave,
  onClick,
}: {
  value: number;
  hover: number;
  onHover: (n: number) => void;
  onLeave: () => void;
  onClick: (n: number) => void;
}) {
  const active = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => onHover(star)}
          onMouseLeave={onLeave}
          onClick={() => onClick(star)}
          className="focus:outline-none"
          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              star <= active ? "text-amber-400" : "text-gray-200"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const project = PROJECTS.find((p) => p.id === id);

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

  // Rating state — persisted to localStorage per project
  const ratingKey = `vendor_rating_${project.id}`;
  const savedRating = (() => {
    try { return JSON.parse(localStorage.getItem(ratingKey) ?? "null"); } catch { return null; }
  })();
  const [expandedBid, setExpandedBid] = useState<string | null>(null);

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

  const [ratingValue, setRatingValue] = useState<number>(savedRating?.stars ?? 0);
  const [ratingComment, setRatingComment] = useState<string>(savedRating?.comment ?? "");
  const [hoverStar, setHoverStar] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(!!savedRating);

  // Payment/deposit state
  const depositKey = `deposit_${id}`;
  const [depositPaid, setDepositPaid] = useState(() => {
    try { return JSON.parse(localStorage.getItem(depositKey) ?? "null"); } catch { return null; }
  });

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

  function submitRating() {
    if (!ratingValue) return;
    localStorage.setItem(ratingKey, JSON.stringify({ stars: ratingValue, comment: ratingComment }));
    setRatingSubmitted(true);
  }

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

        {/* Bids */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">
            {project.status === "completed" ? "All Bids" : "Bids Received"}
          </h2>

          <div className="space-y-4">
            {project.bids.map((bid) => {
              const isChosen = bid.id === project.chosenBidId;
              return (
                <div
                  key={bid.id}
                  className={`border rounded-lg p-5 transition-colors ${
                    isChosen
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: avatar + vendor info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
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
                      <div className="text-xl font-bold text-foreground">
                        ${bid.price.toLocaleString()}
                      </div>
                      {(project.status === "active" || project.status === "bidding") && (
                        <button
                          onClick={() => handleAcceptBid(bid.id)}
                          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          Accept Bid
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
                    {bid.message}
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
                            <td className="pt-2 text-right font-bold text-foreground">${bid.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
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
                    <p className="text-xs text-green-600">${depositPaid.amount} · {depositPaid.date} · Remaining balance due at completion</p>
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
                      const deposit = Math.round(price * 0.25);
                      const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const info = { amount: deposit, date };
                      localStorage.setItem(depositKey, JSON.stringify(info));
                      setDepositPaid(info);
                    }}
                    className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Pay 25% Deposit
                  </button>
                  <button
                    onClick={() => {
                      const price = project.bids.find((b) => b.id === bookingConfirmed.bidId)?.price ?? 0;
                      const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const info = { amount: price, date, full: true };
                      localStorage.setItem(depositKey, JSON.stringify(info));
                      setDepositPaid(info);
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
            <div className="border border-border rounded-lg p-6">
              {/* Vendor row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {chosenBid.vendorInitials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{chosenBid.vendorName}</p>
                  <p className="text-xs text-muted-foreground">Chosen vendor for this project</p>
                </div>
              </div>

              {ratingSubmitted ? (
                /* Submitted state */
                <div className="flex flex-col items-start gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-6 h-6 ${star <= ratingValue ? "text-amber-400" : "text-gray-200"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d={STAR_PATH} />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{ratingValue} / 5</span>
                    <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                      Submitted
                    </span>
                  </div>
                  {ratingComment && (
                    <p className="text-sm text-muted-foreground italic">"{ratingComment}"</p>
                  )}
                  <button
                    onClick={() => setRatingSubmitted(false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Edit rating
                  </button>
                </div>
              ) : (
                /* Rating form */
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      How would you rate this vendor?
                    </p>
                    <StarPicker
                      value={ratingValue}
                      hover={hoverStar}
                      onHover={setHoverStar}
                      onLeave={() => setHoverStar(0)}
                      onClick={setRatingValue}
                    />
                    {ratingValue > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {["", "Poor", "Fair", "Good", "Very good", "Excellent"][ratingValue]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Comments{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Share your experience with this vendor…"
                      rows={3}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={submitRating}
                    disabled={!ratingValue}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit Rating
                  </button>
                </div>
              )}
            </div>
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
    </div>
  );
}
