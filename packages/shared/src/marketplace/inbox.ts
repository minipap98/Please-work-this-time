// Conversations are bid threads: one per bid that has messages.

import type { Bid, BidMessage, Project } from "./types";

export interface InboxThread {
  bid: Bid;
  project: Project;
  lastMessage: BidMessage;
  unreadCount: number;
}

export interface ThreadOptions {
  /** The reader. Live messages know their recipient and read status, so unread = sent to me and not read. */
  userId?: string;
  /** Fallback for messages without a recipient (demo): how many of the thread the reader has seen. */
  readCount?: (bidId: string) => number;
  /** With readCount: which side's messages count as unread for this reader. Owners read vendor messages. */
  from?: BidMessage["from"];
}

function unreadIn(thread: BidMessage[], bidId: string, opts: ThreadOptions): number {
  const tracked = thread.some((m) => m.recipientId !== undefined);
  if (opts.userId && tracked) {
    return thread.filter((m) => m.recipientId === opts.userId && !m.read).length;
  }
  const from = opts.from ?? "vendor";
  const seen = opts.readCount?.(bidId) ?? 0;
  return thread.filter((m, i) => m.from === from && i >= seen).length;
}

function messageTime(m: BidMessage): number {
  const t = new Date(m.time).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Threads with messages, newest activity first, with the count of unseen messages from the other side. */
export function buildThreads(projects: Project[], opts: ThreadOptions): InboxThread[] {
  const threads: InboxThread[] = [];
  for (const project of projects) {
    for (const bid of project.bids) {
      if (bid.thread.length === 0) continue;
      const unreadCount = unreadIn(bid.thread, bid.id, opts);
      threads.push({ bid, project, lastMessage: bid.thread[bid.thread.length - 1], unreadCount });
    }
  }
  threads.sort((a, b) => messageTime(b.lastMessage) - messageTime(a.lastMessage));
  return threads;
}
