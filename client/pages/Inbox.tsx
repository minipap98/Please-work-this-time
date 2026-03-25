import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import {
  useInboxThreads,
  useBidMessages,
  useSendMessage,
  useMarkMessagesRead,
} from "@/hooks/use-supabase";

/** Format a timestamp for display */
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

/** Quote card shown in chat — with Accept / Decline actions */
function InboxQuoteCard({
  msg,
  vendorName,
  vendorInitials,
  boat,
}: {
  msg: any;
  vendorName: string;
  vendorInitials: string;
  boat?: { name: string; make: string; model: string; year: string } | null;
}) {
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
            <p className="text-sm font-semibold text-foreground">{msg.quote_title}</p>
            <p className="text-base font-bold text-foreground flex-shrink-0">
              ${msg.quote_price?.toLocaleString()}
            </p>
          </div>
          {msg.quote_description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {msg.quote_description}
            </p>
          )}
          {boat && (
            <p className="text-[10px] text-muted-foreground">
              For "{boat.name}" · {boat.year} {boat.make} {boat.model}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">{formatMessageTime(msg.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all inbox threads
  const { data: threads, isLoading: threadsLoading } = useInboxThreads();

  // Fetch messages for the selected thread
  const { data: messages, isLoading: messagesLoading } = useBidMessages(
    selectedBidId ?? undefined
  );

  // Mutations
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();

  // Find the selected thread data
  const selectedThread = threads?.find((t) => t.bidId === selectedBidId) ?? null;

  // Mark messages as read when opening a thread
  useEffect(() => {
    if (selectedBidId && selectedThread && selectedThread.unreadCount > 0) {
      markRead.mutate(selectedBidId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBidId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!replyText.trim() || !selectedBidId || !selectedThread) return;
    sendMessage.mutate(
      {
        bid_id: selectedBidId,
        recipient_id: selectedThread.otherUserId,
        text: replyText.trim(),
      },
      {
        onSuccess: () => setReplyText(""),
      }
    );
  }

  function getVendorName(thread: NonNullable<typeof threads>[number]) {
    return thread.vendor?.business_name ?? "Unknown Vendor";
  }

  function getVendorInitials(thread: NonNullable<typeof threads>[number]) {
    const name = thread.vendor?.business_name ?? "?";
    return name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function getProjectTitle(thread: NonNullable<typeof threads>[number]) {
    return thread.project?.title ?? "Direct Message";
  }

  function getLastMessagePreview(thread: NonNullable<typeof threads>[number]) {
    const msg = thread.lastMessage;
    if (!msg) return "";
    if (msg.is_quote) return `📋 Quote: ${msg.quote_title}`;
    const isOwn = msg.sender_id === user?.id;
    const preview = msg.text.length > 50 ? msg.text.slice(0, 50) + "…" : msg.text;
    return isOwn ? `You: ${preview}` : preview;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Inbox</h1>

        {threadsLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !threads || threads.length === 0 ? (
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden h-[620px]">
            {/* Thread list */}
            <div className="md:col-span-1 border-r border-border overflow-y-auto">
              {threads.map((thread) => {
                const isSelected = selectedBidId === thread.bidId;
                return (
                  <button
                    key={thread.bidId}
                    onClick={() => {
                      setSelectedBidId(thread.bidId);
                      setReplyText("");
                    }}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/50 last:border-0 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getVendorInitials(thread)}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate flex-1">
                        {getVendorName(thread)}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate ml-9">
                      {getProjectTitle(thread)}
                    </p>
                    <div className="flex items-center gap-2 ml-9 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1 italic">
                        {getLastMessagePreview(thread)}
                      </p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(thread.lastMessage.created_at)}
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
                        {getVendorInitials(selectedThread)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {getVendorName(selectedThread)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getProjectTitle(selectedThread)}
                        </p>
                      </div>
                    </div>
                    {selectedThread.project && (
                      <button
                        onClick={() => navigate(`/project/${selectedThread.project!.id}`)}
                        className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity"
                      >
                        View bid →
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : (
                      <>
                        {(messages ?? []).map((msg: any) => {
                          const isOwn = msg.sender_id === user?.id;

                          // Quote message
                          if (msg.is_quote) {
                            return (
                              <InboxQuoteCard
                                key={msg.id}
                                msg={msg}
                                vendorName={getVendorName(selectedThread)}
                                vendorInitials={getVendorInitials(selectedThread)}
                                boat={selectedThread.boat}
                              />
                            );
                          }

                          // Regular message
                          return (
                            <div
                              key={msg.id}
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
                                <div className="flex items-center gap-1 mt-1">
                                  <p
                                    className={`text-[10px] ${
                                      isOwn
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                  {isOwn && (
                                    <span
                                      className={`text-[10px] ${
                                        msg.status === "read"
                                          ? "text-primary-foreground/90"
                                          : "text-primary-foreground/50"
                                      }`}
                                    >
                                      {msg.status === "read"
                                        ? "✓✓"
                                        : msg.status === "delivered"
                                        ? "✓"
                                        : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
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
                      disabled={!replyText.trim() || sendMessage.isPending}
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sendMessage.isPending ? "…" : "Send"}
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
