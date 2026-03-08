import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { PROJECTS } from "@/data/projectData";

export default function Inbox() {
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<{ projectId: string; bidId: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [, forceUpdate] = useState(0);

  // Gather all threads that have at least one message
  const threads = PROJECTS.flatMap((project) =>
    project.bids
      .filter((bid) => bid.thread.length > 0)
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

  const allMessages = selected
    ? [...selected.bid.thread, ...getLocalMessages(selected.bid.id)]
    : [];

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden h-[600px]">
            {/* Thread list */}
            <div className="md:col-span-1 border-r border-border overflow-y-auto">
              {threads.map(({ project, bid }) => {
                const isSelected =
                  selectedThread?.projectId === project.id &&
                  selectedThread?.bidId === bid.id;
                const localMsgs = getLocalMessages(bid.id);
                const allMsgs = [...bid.thread, ...localMsgs];
                const lastMsg = allMsgs[allMsgs.length - 1];
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
                    </div>
                    <p className="text-xs text-muted-foreground truncate ml-9">{project.title}</p>
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground truncate ml-9 mt-0.5 italic">
                        {lastMsg.from === "user" ? "You: " : ""}{lastMsg.text}
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
                    {allMessages.map((msg, i) => (
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
                    ))}
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
