import { PageContainer, PageHeader } from "@/components/app/Page";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { BidMessage, Project } from "@/data/projectData";
import { buildThreads as buildSharedThreads, type InboxThread } from "@shared/marketplace/inbox";
import { useOwnerMarketplaceProjects, useVendorBidProjects } from "@/hooks/use-marketplace";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import { useMarkMessagesRead, useSendMessage } from "@/hooks/use-supabase";
import { isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatMessageTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return dateStr;
  }
}

// ─── Build thread list from project data ────────────────────────────────────

// How far into each thread this browser has read (per-browser until messages.status drives it).
function readCount(bidId: string): number {
  return parseInt(localStorage.getItem(`msg_read_${bidId}`) ?? "0", 10);
}

function buildThreads(projects: Project[], userId?: string): InboxThread[] {
  // Live messages carry read receipts; the demo falls back to the browser index.
  return buildSharedThreads(projects, { userId, readCount });
}

// ─── Quote Card ─────────────────────────────────────────────────────────────

function QuoteCard({
  msg,
  vendorName,
  vendorInitials,
}: {
  msg: BidMessage;
  vendorName: string;
  vendorInitials: string;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {vendorInitials}
          </div>
          <span className="text-xs font-semibold text-foreground">{vendorName}</span>
          <span className="text-xs text-muted-foreground">· Quote Proposal</span>
        </div>
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
          <p className="text-[10px] text-muted-foreground">{formatMessageTime(msg.time)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Inbox Page ─────────────────────────────────────────────────────────────

export default function Inbox() {
  const navigate = useNavigate();
  const { role, vendorId } = useRole();
  const { user } = useAuth();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();
  const ownerQuery = useOwnerMarketplaceProjects();
  const vendorQuery = useVendorBidProjects(role === "vendor" ? vendorId : null);
  const liveProjects = (role === "vendor" ? vendorQuery.data : ownerQuery.data) ?? [];
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = isDemoMode() ? undefined : user?.id;
  useEffect(() => {
    setThreads(buildThreads(liveProjects, userId));
  }, [liveProjects, userId]);

  useEffect(() => {
    const onFocus = () => setThreads(buildThreads(liveProjects, userId));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [liveProjects, userId]);

  const selectedThread = threads.find((t) => t.bid.id === selectedBidId) ?? null;

  // Mark read when opening a thread: on the messages themselves for live accounts, in this browser for the demo.
  useEffect(() => {
    if (selectedBidId && selectedThread && selectedThread.unreadCount > 0) {
      localStorage.setItem(`msg_read_${selectedBidId}`, String(selectedThread.bid.thread.length));
      if (userId) {
        markRead.mutate(selectedBidId, { onSuccess: () => (role === "vendor" ? vendorQuery : ownerQuery).refetch() });
      }
      setThreads(buildThreads(liveProjects, userId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBidId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedBidId, selectedThread?.bid.thread.length]);

  async function handleSend() {
    if (!replyText.trim() || !selectedThread || !user) return;
    const recipientId =
      role === "vendor"
        ? selectedThread.project.ownerId
        : selectedThread.bid.vendorUserId;
    if (!recipientId) {
      toast.error("Can't find the other person on this thread yet.");
      return;
    }
    try {
      await sendMessage.mutateAsync({
        bid_id: selectedThread.bid.id,
        recipient_id: recipientId,
        text: replyText.trim(),
      });
      setReplyText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message failed.");
    }
  }

  // Get messages: static thread + any localStorage additions
  function getMessages(thread: InboxThread): BidMessage[] {
    const extra: BidMessage[] = JSON.parse(
      localStorage.getItem(`bid_messages_${thread.bid.id}`) ?? "[]"
    );
    return [...thread.bid.thread, ...extra];
  }

  return (
    <div className="min-h-full">
      <PageContainer>
        <PageHeader title="Inbox" description="Messages with the shops and owners you're working with." />

        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg
              className="w-12 h-12 text-muted-foreground/40 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-muted-foreground text-sm">No messages yet.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Messages from vendors on your projects will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden h-[620px]">
            {/* Thread list */}
            <div className="md:col-span-1 border-r border-border overflow-y-auto">
              {threads.map((thread) => {
                const isSelected = selectedBidId === thread.bid.id;
                return (
                  <button
                    key={thread.bid.id}
                    onClick={() => {
                      setSelectedBidId(thread.bid.id);
                      setReplyText("");
                    }}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/50 last:border-0 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {thread.bid.vendorInitials}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate flex-1">
                        {thread.bid.vendorName}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate ml-9">
                      {thread.project.title}
                    </p>
                    <div className="flex items-center gap-2 ml-9 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1 italic">
                        {thread.lastMessage.type === "quote"
                          ? `📋 Quote: ${thread.lastMessage.quoteTitle}`
                          : thread.lastMessage.from === "user"
                          ? `You: ${thread.lastMessage.text.slice(0, 50)}`
                          : thread.lastMessage.text.slice(0, 50)}
                        {thread.lastMessage.text.length > 50 ? "…" : ""}
                      </p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(thread.lastMessage.time)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chat panel */}
            <div className="md:col-span-2 flex flex-col">
              {selectedThread ? (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {selectedThread.bid.vendorInitials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedThread.bid.vendorName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedThread.project.title}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/project/${selectedThread.project.id}`)}
                      className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity"
                    >
                      View project →
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {getMessages(selectedThread).map((msg, i) => {
                      const isOwn = msg.from === "user";

                      if (msg.type === "quote") {
                        return (
                          <QuoteCard
                            key={`msg-${i}`}
                            msg={msg}
                            vendorName={selectedThread.bid.vendorName}
                            vendorInitials={selectedThread.bid.vendorInitials}
                          />
                        );
                      }

                      return (
                        <div
                          key={`msg-${i}`}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {formatMessageTime(msg.time)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply box */}
                  <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Type a message…"
                      className="flex-1 border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
      </PageContainer>
    </div>
  );
}
