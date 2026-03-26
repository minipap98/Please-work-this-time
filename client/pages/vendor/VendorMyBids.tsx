import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import {
  getVendorBidProjects, getAllMessages, sendVendorMessage,
  isBidAccepted, sendVendorQuote, getBidAdjustment, saveBidAdjustment,
  getRescindedBidIds, rescindBid,
} from "@/data/bidUtils";
import { Bid, BidMessage, Project } from "@/data/projectData";
import { getEscrowStatus } from "@/data/vendorRetentionUtils";

type BidFilter = "all" | "submitted" | "accepted" | "completed" | "lost" | "expired" | "rescinded";

function getBidFilter(bid: Bid, project: Project): Exclude<BidFilter, "all"> {
  // Rescinded takes priority — vendor withdrew before any decision
  if (getRescindedBidIds().includes(bid.id)) return "rescinded";
  if (project.chosenBidId === bid.id) {
    return project.status === "completed" ? "completed" : "accepted";
  }
  // Also check localStorage booking (for bids accepted via the owner UI)
  try {
    const raw = localStorage.getItem(`booking_${project.id}`);
    if (raw) {
      const booking = JSON.parse(raw);
      if (booking.bidId === bid.id) return "accepted";
    }
  } catch {}
  if (project.status === "expired") return "expired";
  if (project.status === "completed" || project.status === "in-progress") return "lost";
  return "submitted";
}

const FILTER_CONFIG: {
  key: BidFilter;
  label: string;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    key: "all",
    label: "All",
    activeClass: "bg-foreground text-background",
    badgeClass: "bg-muted-foreground/20 text-foreground",
  },
  {
    key: "submitted",
    label: "Submitted",
    activeClass: "bg-sky-500 text-white",
    badgeClass: "bg-sky-100 text-sky-700",
  },
  {
    key: "accepted",
    label: "Accepted",
    activeClass: "bg-green-600 text-white",
    badgeClass: "bg-green-100 text-green-700",
  },
  {
    key: "completed",
    label: "Completed",
    activeClass: "bg-blue-600 text-white",
    badgeClass: "bg-blue-50 text-blue-700",
  },
  {
    key: "lost",
    label: "Lost",
    activeClass: "bg-muted-foreground text-white",
    badgeClass: "bg-muted text-muted-foreground",
  },
  {
    key: "expired",
    label: "Expired",
    activeClass: "bg-red-500 text-white",
    badgeClass: "bg-red-50 text-red-500",
  },
  {
    key: "rescinded",
    label: "Withdrawn",
    activeClass: "bg-zinc-600 text-white",
    badgeClass: "bg-zinc-100 text-zinc-600",
  },
];

function BidStatusBadge({ bid, project }: { bid: Bid; project: Project }) {
  const status = getBidFilter(bid, project);
  const config = FILTER_CONFIG.find((f) => f.key === status)!;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
      {config.label}
    </span>
  );
}

/** Render a quote proposal as a card (vendor's outgoing quote) */
function QuoteCard({ msg }: { msg: BidMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-sky-200 bg-sky-50 px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-sky-700 text-xs font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Quote Proposal Sent
        </div>
        <p className="text-sm font-semibold text-foreground">{msg.quoteTitle}</p>
        <p className="text-base font-bold text-sky-600">${msg.quotePrice?.toLocaleString()}</p>
        {msg.quoteDescription && (
          <p className="text-xs text-muted-foreground leading-relaxed">{msg.quoteDescription}</p>
        )}
        <p className="text-[10px] text-muted-foreground">{msg.time}</p>
      </div>
    </div>
  );
}

/** Congratulations overlay — shown once per newly accepted bid */
function CongratsBanner({
  projectTitle,
  price,
  vendorName: _vendorName,
  onClose,
}: {
  projectTitle: string;
  price: number;
  vendorName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        {/* Confetti ring */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <span className="text-4xl">🎉</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1">Congratulations!</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your bid was accepted by the boat owner.
        </p>

        {/* Project info card */}
        <div className="bg-muted/40 rounded-xl px-5 py-4 mb-6 text-left space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</p>
          <p className="text-sm font-semibold text-foreground">{projectTitle}</p>
          <p className="text-xl font-bold text-green-600">${price.toLocaleString()}</p>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          The owner will be in touch to confirm the service window. Check your messages for details.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          View My Bids
        </button>
      </div>
    </div>
  );
}

export default function VendorMyBids() {
  const { vendorId } = useRole();
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<BidFilter>("all");
  const [, forceUpdate] = useState(0);

  // ── Congratulations notification ────────────────────────────────────────────
  const [congratsBid, setCongratssBid] = useState<{ projectTitle: string; price: number; vendorName: string } | null>(null);

  // ── Quote form state ────────────────────────────────────────────────────────
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState("");
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDescription, setQuoteDescription] = useState("");

  // ── Adjust bid state ────────────────────────────────────────────────────────
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustPrice, setAdjustPrice] = useState("");
  const [adjustMessage, setAdjustMessage] = useState("");

  // ── Rescind bid state ────────────────────────────────────────────────────────
  const [showRescindConfirm, setShowRescindConfirm] = useState(false);

  const myBids = vendorId ? getVendorBidProjects(vendorId) : [];

  // ── Detect newly accepted bids and show congrats once ───────────────────────
  useEffect(() => {
    for (const { project, bid } of myBids) {
      if (!isBidAccepted(project, bid)) continue;
      const notifiedKey = `bid_accepted_notified_${bid.id}`;
      if (localStorage.getItem(notifiedKey)) continue;
      // First time seeing this acceptance — show the pop-up
      localStorage.setItem(notifiedKey, "1");
      setCongratssBid({ projectTitle: project.title, price: bid.price, vendorName: bid.vendorName });
      break; // show one at a time
    }
  }, [myBids.length]); // re-check when bid count changes

  // Count per filter
  const counts = useMemo(() => {
    const result: Record<BidFilter, number> = {
      all: myBids.length,
      submitted: 0,
      accepted: 0,
      completed: 0,
      lost: 0,
      expired: 0,
      rescinded: 0,
    };
    for (const { bid, project } of myBids) {
      result[getBidFilter(bid, project)]++;
    }
    return result;
  }, [myBids]);

  const filteredBids = useMemo(
    () =>
      filter === "all"
        ? myBids
        : myBids.filter(({ bid, project }) => getBidFilter(bid, project) === filter),
    [myBids, filter]
  );

  // Auto-select first visible bid
  const activeId =
    selectedBidId && filteredBids.find((b) => b.bid.id === selectedBidId)
      ? selectedBidId
      : (filteredBids[0]?.bid.id ?? null);

  const selected = activeId ? filteredBids.find((b) => b.bid.id === activeId) : null;
  const allMessages = selected ? getAllMessages(selected.bid) : [];

  // Derived flags for selected bid
  const bidAccepted = selected ? isBidAccepted(selected.project, selected.bid) : false;
  const bidStatus = selected ? getBidFilter(selected.bid, selected.project) : null;
  const adjustment = selected ? getBidAdjustment(selected.bid.id) : null;
  const displayPrice = adjustment?.price ?? selected?.bid.price;

  function sendReply() {
    if (!replyText.trim() || !selected) return;
    sendVendorMessage(selected.bid.id, replyText.trim());
    const allMsgs = getAllMessages(selected.bid);
    localStorage.setItem(`vendor_msg_read_${selected.bid.id}`, String(allMsgs.length));
    setReplyText("");
    forceUpdate((n) => n + 1);
  }

  function submitQuote() {
    if (!quoteTitle.trim() || !quotePrice || !selected) return;
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) return;
    const quoteId = `q_${Date.now()}`;
    sendVendorQuote(selected.bid.id, quoteId, quoteTitle.trim(), price, quoteDescription.trim());
    setQuoteTitle("");
    setQuotePrice("");
    setQuoteDescription("");
    setShowQuoteForm(false);
    forceUpdate((n) => n + 1);
  }

  function saveAdjustment() {
    if (!adjustPrice || !selected) return;
    const price = parseFloat(adjustPrice);
    if (isNaN(price) || price <= 0) return;
    saveBidAdjustment(selected.bid.id, price, adjustMessage.trim());
    setShowAdjustForm(false);
    forceUpdate((n) => n + 1);
  }

  function rescindSelectedBid() {
    if (!selected) return;
    rescindBid(selected.bid.id);
    setShowRescindConfirm(false);
    setShowAdjustForm(false);
    setShowQuoteForm(false);
    forceUpdate((n) => n + 1);
  }

  function switchFilter(f: BidFilter) {
    setFilter(f);
    setSelectedBidId(null);
    setMobileView("list");
    setShowQuoteForm(false);
    setShowAdjustForm(false);
    setShowRescindConfirm(false);
  }

  if (myBids.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-6">My Bids</h1>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="w-12 h-12 text-muted-foreground/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-muted-foreground text-sm">No bids submitted yet.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      {/* Congratulations overlay — shown once per newly accepted bid */}
      {congratsBid && (
        <CongratsBanner
          projectTitle={congratsBid.projectTitle}
          price={congratsBid.price}
          vendorName={congratsBid.vendorName}
          onClose={() => setCongratssBid(null)}
        />
      )}

      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-semibold text-foreground">My Bids</h1>
          <span className="text-sm text-muted-foreground">{myBids.length} total</span>
        </div>

        {/* ── Filter toggle ─────────────────────────────────── */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-5">
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl w-max min-w-0">
            {FILTER_CONFIG.map(({ key, label, activeClass, badgeClass }) => {
              const isActive = filter === key;
              const count = counts[key];
              return (
                <button
                  key={key}
                  onClick={() => switchFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? `${activeClass} shadow-sm`
                      : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 transition-colors ${
                        isActive ? "bg-white/25 text-current" : badgeClass
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Two-panel layout ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden md:h-[680px]">

          {/* Bid list — hidden on mobile when viewing a bid detail */}
          <div className={`md:col-span-1 border-r border-border overflow-y-auto ${mobileView === "detail" ? "hidden md:block" : "block"}`}>
            {filteredBids.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-10">
                <p className="text-sm text-muted-foreground">
                  No {filter === "all" ? "" : filter} bids yet.
                </p>
              </div>
            ) : (
              filteredBids.map(({ project, bid }) => {
                const isSelected = activeId === bid.id;
                const msgs = getAllMessages(bid);
                const lastMsg = msgs[msgs.length - 1];
                const adj = getBidAdjustment(bid.id);
                const shownPrice = adj?.price ?? bid.price;
                return (
                  <button
                    key={bid.id}
                    onClick={() => {
                      setSelectedBidId(bid.id);
                      setMobileView("detail");
                      setReplyText("");
                      setShowQuoteForm(false);
                      setShowAdjustForm(false);
                      setShowRescindConfirm(false);
                      localStorage.setItem(`vendor_msg_read_${bid.id}`, String(msgs.length));
                      forceUpdate((n) => n + 1);
                    }}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/50 last:border-0 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground leading-tight flex-1 truncate">
                        {project.title}
                      </p>
                      <BidStatusBadge bid={bid} project={project} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {project.date} · ${shownPrice.toLocaleString()}
                      {adj && <span className="ml-1 text-amber-600 font-medium">(revised)</span>}
                    </p>
                    {project.boat && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        "{project.boat.name}" · {project.boat.year} {project.boat.make} {project.boat.model}
                      </p>
                    )}
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground truncate mt-1 italic">
                        {lastMsg.from === "vendor" ? "You: " : "Owner: "}{lastMsg.text}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Chat panel — full-screen overlay on mobile when a bid is selected */}
          <div className={`md:col-span-2 flex flex-col ${
            mobileView === "list"
              ? "hidden md:flex"
              : "fixed inset-0 z-40 bg-white md:static md:inset-auto md:z-auto"
          }`}>
            {/* Mobile back navigation bar */}
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden flex items-center gap-2 px-4 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground border-b border-border bg-slate-50/80 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              All Bids
            </button>

            {selected ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border flex-shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">{selected.project.title}</p>
                      {selected.project.boat ? (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
                          </svg>
                          <span className="font-medium text-foreground">"{selected.project.boat.name}"</span>
                          <span>·</span>
                          <span>{selected.project.boat.year} {selected.project.boat.make} {selected.project.boat.model}</span>
                          <span className="hidden sm:inline">· {selected.project.boat.propulsion}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{selected.project.description.slice(0, 80)}…</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-sm font-semibold text-foreground">
                          ${displayPrice?.toLocaleString()}
                        </span>
                        {adjustment && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                            Revised
                          </span>
                        )}
                        <BidStatusBadge bid={selected.bid} project={selected.project} />
                        {bidAccepted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Escrow
                          </span>
                        )}
                      </div>
                      {/* Adjust + Rescind buttons — only for submitted bids */}
                      {bidStatus === "submitted" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setShowAdjustForm((v) => !v); setShowQuoteForm(false); setShowRescindConfirm(false); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Adjust
                          </button>
                          <button
                            onClick={() => { setShowRescindConfirm((v) => !v); setShowAdjustForm(false); setShowQuoteForm(false); }}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-md px-2 py-1 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Rescind
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adjust bid inline form */}
                {showAdjustForm && (
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">Revise your bid</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">New price ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={adjustPrice}
                          onChange={(e) => setAdjustPrice(e.target.value)}
                          className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Updated note (optional)</label>
                      <textarea
                        value={adjustMessage}
                        onChange={(e) => setAdjustMessage(e.target.value)}
                        rows={2}
                        className="w-full border border-border rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                        placeholder="Explain the revision…"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowAdjustForm(false)}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveAdjustment}
                        disabled={!adjustPrice}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-40"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Rescind confirmation banner */}
                {showRescindConfirm && (
                  <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
                    <p className="text-xs font-semibold text-red-800 mb-1">Withdraw this bid?</p>
                    <p className="text-xs text-red-600 mb-3">
                      This will remove your bid from the owner's view. This action cannot be undone.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowRescindConfirm(false)}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={rescindSelectedBid}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Yes, Withdraw Bid
                      </button>
                    </div>
                  </div>
                )}

                {/* Bid summary */}
                {(selected.bid.message || selected.bid.lineItems?.length) && (
                  <div className="px-4 py-3 bg-muted/30 border-b border-border flex-shrink-0 space-y-2.5">
                    {(adjustment?.message || selected.bid.message) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          Your bid message
                          {adjustment?.message && adjustment.message !== selected.bid.message && (
                            <span className="ml-1.5 text-amber-600">(revised)</span>
                          )}
                        </p>
                        <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                          {adjustment?.message || selected.bid.message}
                        </p>
                      </div>
                    )}
                    {selected.bid.lineItems && selected.bid.lineItems.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Itemized estimate</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/50">
                              <th className="text-left pb-1 font-medium">Description</th>
                              <th className="text-center pb-1 font-medium w-8">Qty</th>
                              <th className="text-right pb-1 font-medium w-16">Unit</th>
                              <th className="text-right pb-1 font-medium w-16">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.bid.lineItems.map((item, i) => (
                              <tr key={i} className="border-b border-border/30 last:border-0">
                                <td className="py-1 text-foreground">{item.description}</td>
                                <td className="py-1 text-center text-muted-foreground">{item.quantity}</td>
                                <td className="py-1 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                                <td className="py-1 text-right font-medium text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border">
                              <td colSpan={3} className="pt-1.5 text-right font-semibold text-foreground">Total</td>
                              <td className="pt-1.5 text-right font-bold text-foreground">
                                ${(adjustment?.price ?? selected.bid.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[240px] md:min-h-0">
                  {allMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">No messages yet. Send the owner a note below.</p>
                    </div>
                  ) : (
                    allMessages.map((msg, i) => {
                      // Quote proposal — render as card
                      if (msg.type === "quote") {
                        return <QuoteCard key={i} msg={msg} />;
                      }
                      return (
                        <div
                          key={i}
                          className={`flex ${msg.from === "vendor" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              msg.from === "vendor"
                                ? "bg-sky-500 text-white rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 ${msg.from === "vendor" ? "text-white/70" : "text-muted-foreground"}`}>
                              {msg.time}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Withdrawn notice — replaces reply box for rescinded bids */}
                {bidStatus === "rescinded" && (
                  <div className="px-4 py-4 border-t border-border flex-shrink-0 bg-zinc-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-700">You withdrew this bid</p>
                      <p className="text-xs text-zinc-500">This bid is no longer visible to the boat owner.</p>
                    </div>
                  </div>
                )}

                {/* Escrow timeline — shown for accepted bids */}
                {bidAccepted && bidStatus !== "rescinded" && (() => {
                  const escrow = getEscrowStatus(selected.project.id, selected.bid.id, selected.bid.price);
                  return (
                    <div className="px-4 py-3 border-t border-emerald-200 bg-emerald-50/50 flex-shrink-0">
                      <div className="flex items-center gap-1.5 mb-2">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-xs font-semibold text-emerald-700">{escrow.statusLabel}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {escrow.timeline.map((step, i) => (
                          <div key={i} className="flex items-center gap-1 flex-1">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              step.status === "complete" ? "bg-emerald-500" :
                              step.status === "active" ? "bg-sky-500 animate-pulse" :
                              "bg-gray-300"
                            }`} />
                            <span className={`text-[10px] leading-tight ${
                              step.status === "complete" ? "text-emerald-700" :
                              step.status === "active" ? "text-sky-700 font-medium" :
                              "text-muted-foreground"
                            }`}>
                              {step.step}
                            </span>
                            {i < escrow.timeline.length - 1 && (
                              <div className={`flex-1 h-px ${step.status === "complete" ? "bg-emerald-300" : "bg-gray-200"}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Quote form (appears above reply box for accepted bids) */}
                {bidAccepted && showQuoteForm && (
                  <div className="px-4 py-3 bg-sky-50 border-t border-sky-200 flex-shrink-0 space-y-2">
                    <p className="text-xs font-semibold text-sky-800">New quote proposal</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Service title</label>
                        <input
                          type="text"
                          value={quoteTitle}
                          onChange={(e) => setQuoteTitle(e.target.value)}
                          className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          placeholder="e.g. Bottom Paint Job"
                        />
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Price ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Description (optional)</label>
                      <textarea
                        value={quoteDescription}
                        onChange={(e) => setQuoteDescription(e.target.value)}
                        rows={2}
                        className="w-full border border-border rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                        placeholder="Briefly describe the service…"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowQuoteForm(false)}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitQuote}
                        disabled={!quoteTitle.trim() || !quotePrice}
                        className="px-3 py-1.5 text-xs font-semibold bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors disabled:opacity-40"
                      >
                        Send Quote →
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply box — hidden for rescinded bids */}
                {bidStatus !== "rescinded" && (
                  <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-2">
                    {/* Submit Quote pill — only for accepted/completed bids */}
                    {bidAccepted && !showQuoteForm && (
                      <button
                        onClick={() => { setShowQuoteForm(true); setShowAdjustForm(false); }}
                        className="flex items-center gap-1.5 text-xs text-sky-600 font-medium border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-full px-3 py-1 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Propose a new service quote
                      </button>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendReply()}
                        placeholder="Message the boat owner…"
                        className="flex-1 border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                      />
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim()}
                        className="px-4 py-2 rounded-md bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a bid to view the conversation</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
