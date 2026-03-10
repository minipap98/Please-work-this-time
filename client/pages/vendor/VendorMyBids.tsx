import { useState, useMemo } from "react";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { getVendorBidProjects, getAllMessages, sendVendorMessage } from "@/data/bidUtils";
import { Bid, Project } from "@/data/projectData";

type BidFilter = "all" | "submitted" | "accepted" | "completed" | "lost" | "expired";

function getBidFilter(bid: Bid, project: Project): Exclude<BidFilter, "all"> {
  if (project.chosenBidId === bid.id) {
    return project.status === "completed" ? "completed" : "accepted";
  }
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

export default function VendorMyBids() {
  const { vendorId } = useRole();
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<BidFilter>("all");
  const [, forceUpdate] = useState(0);

  const myBids = vendorId ? getVendorBidProjects(vendorId) : [];

  // Count per filter
  const counts = useMemo(() => {
    const result: Record<BidFilter, number> = {
      all: myBids.length,
      submitted: 0,
      accepted: 0,
      completed: 0,
      lost: 0,
      expired: 0,
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

  function sendReply() {
    if (!replyText.trim() || !selected) return;
    sendVendorMessage(selected.bid.id, replyText.trim());
    const allMsgs = getAllMessages(selected.bid);
    localStorage.setItem(`vendor_msg_read_${selected.bid.id}`, String(allMsgs.length));
    setReplyText("");
    forceUpdate((n) => n + 1);
  }

  function switchFilter(f: BidFilter) {
    setFilter(f);
    setSelectedBidId(null); // reset selection so first of new filter auto-selects
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
    <div className="min-h-screen bg-white">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden md:h-[620px]">

          {/* Bid list */}
          <div className="md:col-span-1 border-r border-border overflow-y-auto">
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
                return (
                  <button
                    key={bid.id}
                    onClick={() => {
                      setSelectedBidId(bid.id);
                      setReplyText("");
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
                    <p className="text-xs text-muted-foreground">{project.date} · ${bid.price.toLocaleString()}</p>
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

          {/* Chat panel */}
          <div className="md:col-span-2 flex flex-col">
            {selected ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selected.project.title}</p>
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-foreground">${selected.bid.price.toLocaleString()}</span>
                    <BidStatusBadge bid={selected.bid} project={selected.project} />
                  </div>
                </div>

                {/* Bid summary */}
                {(selected.bid.message || selected.bid.lineItems?.length) && (
                  <div className="px-4 py-3 bg-muted/30 border-b border-border flex-shrink-0 space-y-2.5">
                    {selected.bid.message && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Your bid message</p>
                        <p className="text-xs text-foreground leading-relaxed line-clamp-2">{selected.bid.message}</p>
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
                              <td className="pt-1.5 text-right font-bold text-foreground">${selected.bid.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
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
                    allMessages.map((msg, i) => (
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
                    ))
                  )}
                </div>

                {/* Reply box */}
                <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
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
