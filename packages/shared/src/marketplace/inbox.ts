// Conversations are bid threads: one per bid that has messages.

import type { Bid, BidMessage, Project } from "./types";

export interface InboxThread {
  bid: Bid;
  project: Project;
  lastMessage: BidMessage;
  unreadCount: number;
}

export interface ThreadOptions {
  /** How many messages of this thread the reader has already seen (0 when unknown). */
  readCount: (bidId: string) => number;
  /** Which side's messages count as unread for this reader. Owners read vendor messages. */
  from?: BidMessage["from"];
}

function messageTime(m: BidMessage): number {
  const t = new Date(m.time).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Threads with messages, newest activity first, with the count of unseen messages from the other side. */
export function buildThreads(projects: Project[], opts: ThreadOptions): InboxThread[] {
  const from = opts.from ?? "vendor";
  const threads: InboxThread[] = [];
  for (const project of projects) {
    for (const bid of project.bids) {
      if (bid.thread.length === 0) continue;
      const seen = opts.readCount(bid.id);
      const unreadCount = bid.thread.filter((m, i) => m.from === from && i >= seen).length;
      threads.push({ bid, project, lastMessage: bid.thread[bid.thread.length - 1], unreadCount });
    }
  }
  threads.sort((a, b) => messageTime(b.lastMessage) - messageTime(a.lastMessage));
  return threads;
}
