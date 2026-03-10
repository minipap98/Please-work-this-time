import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { getAllMessages, getAugmentedProjects, getQuoteStatus, acceptQuote, rejectQuote } from "@/data/bidUtils";
import { BidMessage } from "@/data/projectData";

/** Quote card shown to the owner — with Accept / Decline actions */
function InboxQuoteCard({
  msg,
  vendorName,
  vendorInitials,
  boat,
  onAccept,
  onDecline,
}: {
  msg: BidMessage;
  vendorName: string;
  vendorInitials: string;
  boat?: { name: string; make: string; model: string; year: string; propulsion: string };
  onAccept: () => void;
  onDecline: () => void;
}) {
  const status = msg.quoteId ? getQuoteStatus(msg.quoteId) : null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-white shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {vendorInitials}
          </div>
          <span className="text-xs font-semibold text-foreground">{vendorName}</span>
          <span className="text-xs text-muted-foreground">· Quote Proposal</span>
        </div>

        {/* Quote details */}
        <div className="px-4 py-3 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-semibold text-foreground">{msg.quoteTitle}</p>
            <p className="text-base font-bold text-foreground flex-shrink-0">
              ${msg.quotePrice?.toLocaleString()}
            </p>
          </div>
          {msg.quoteDescription && (
            <p className="text-xs text-muted-foreground leading-relaxed">{msg.quoteDescription}</p>
          )}
          {boat && (
            <p className="text-[10px] text-muted-foreground">
              For "{boat.name}" · {boat.year} {boat.make} {boat.model}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">{msg.time}</p>
        </div>

        {/* Action area */}
        <div className="px-4 pb-3">
          {status === null && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onDecline}
                className="flex-1 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-muted-foreground hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={onAccept}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Accept &amp; Create Project
              </button>
            </div>
          )}
          {status === "accepted" && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                ✓ Project created
              </span>
              <button
                onClick={() => {
                  window.location.href = `/project/local_${msg.quoteId}`;
                }}
                className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity"
              >
                View project →
              </button>
            </div>
          )}
          {status === "rejected" && (
            <div className="pt-1">
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                Declined
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<{ projectId: string; bidId: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [, forceUpdate] = useState(0);

  // Gather all threads that have at least one message (static + local projects + vendor bids)
  const threads = getAugmentedProjects().flatMap((project) =>
    project.bids
      .filter((bid) => getAllMessages(bid).length > 0)
      .map((bid) => ({ project, bid }))
  );

  const selected = selectedThread
    ? threads.find(
        (t) => t.project.id === selectedThread.projectId && t.bid.id === selectedThread.bidId
      )
    : null;

  function getLocalMessages(bidId: string) {
    try { return JSON.parse(localStorage.getItem(`local_msgs_${bidId}`) ?? "[]"); } catch { return []; }
  }

  const allMessages = selected ? getAllMessages(selected.bid) : [];

  function sendReply() {
    if (!replyText.trim() || !selected) return;
    const now = new Date();
    const time =
      now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const msg = { from: "user" as const, text: replyText.trim(), time };
    const key = `local_msgs_${selected.bid.id}`;
    const updated = [...getLocalMessages(selected.bid.id), msg];
    localStorage.setItem(key, JSON.stringify(updated));
    setReplyText("");
    forceUpdate((n) => n + 1);
  }

  function handleAcceptQuote(msg: BidMessage) {
    if (!msg.quoteId || !selected) return;
    acceptQuote(
      msg.quoteId,
      selected.bid.vendorName,
      selected.bid.vendorInitials,
      msg.quoteTitle!,
      msg.quotePrice!,
      msg.quoteDescription ?? "",
      selected.project.boat
    );
    forceUpdate((n) => n + 1);
  }

  function handleRejectQuote(msg: BidMessage) {
    if (!msg.quoteId) return;
    rejectQuote(msg.quoteId);
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Inbox</h1>

        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="w-12 h-12 text-muted-foreground/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden h-[620px]">
            {/* Thread list */}
            <div className="md:col-span-1 border-r border-border overflow-y-auto">
              {threads.map(({ project, bid }) => {
                const isSelected =
                  selectedThread?.projectId === project.id &&
                  selectedThread?.bidId === bid.id;
                const allMsgs = getAllMessages(bid);
                const lastMsg = allMsgs[allMsgs.length - 1];
                // Check if there's any pending (unanswered) quote
                const hasPendingQuote = allMsgs.some(
                  (m) => m.type === "quote" && m.quoteId && getQuoteStatus(m.quoteId) === null
                );
                return (
                  <button
                    key={bid.id}
                    onClick={() => {
                      setSelectedThread({ projectId: project.id, bidId: bid.id });
                      setReplyText("");
                    }}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/50 last:border-0 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {bid.vendorInitials}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate flex-1">
                        {bid.vendorName}
                      </p>
                      {hasPendingQuote && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Pending quote" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate ml-9">{project.title}</p>
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground truncate ml-9 mt-0.5 italic">
                        {lastMsg.type === "quote"
                          ? `📋 Quote: ${lastMsg.quoteTitle}`
                          : lastMsg.from === "user"
                          ? `You: ${lastMsg.text}`
                          : lastMsg.text}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chat panel */}
            <div className="md:col-span-2 flex flex-col">
              {selected ? (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {selected.bid.vendorInitials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selected.bid.vendorName}</p>
                        <p className="text-xs text-muted-foreground">{selected.project.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/project/${selected.project.id}`)}
                      className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity"
                    >
                      View bid →
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {allMessages.map((msg, i) => {
                      // Quote proposal — render as action card
                      if (msg.type === "quote") {
                        return (
                          <InboxQuoteCard
                            key={i}
                            msg={msg}
                            vendorName={selected.bid.vendorName}
                            vendorInitials={selected.bid.vendorInitials}
                            boat={selected.project.boat}
                            onAccept={() => handleAcceptQuote(msg)}
                            onDecline={() => handleRejectQuote(msg)}
                          />
                        );
                      }
                      return (
                        <div
                          key={i}
                          className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              msg.from === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {msg.time}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply box */}
                  <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Type a message…"
                      className="flex-1 border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Select a conversation</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
