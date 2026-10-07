import { useSyncExternalStore } from "react";
import type { Bid } from "@shared/marketplace/types";

/**
 * Which bids the owner has already looked at. Live bids carry `seenAt` from the database
 * (set when the job page opens); this browser-side set is the fallback for the demo and for
 * a database that hasn't got the column yet.
 */
const key = (uid: string) => `bosun_seen_bids:${uid}`;
const listeners = new Set<() => void>();
const cache = new Map<string, Set<string>>();

function load(uid: string): Set<string> {
  let s = cache.get(uid);
  if (!s) {
    try {
      s = new Set(JSON.parse(localStorage.getItem(key(uid)) ?? "[]") as string[]);
    } catch {
      s = new Set();
    }
    cache.set(uid, s);
  }
  return s;
}

export function markBidsSeen(uid: string, bidIds: string[]) {
  if (!uid || bidIds.length === 0) return;
  const s = new Set(load(uid));
  let changed = false;
  for (const id of bidIds) if (!s.has(id)) { s.add(id); changed = true; }
  if (!changed) return;
  cache.set(uid, s);
  try {
    localStorage.setItem(key(uid), JSON.stringify([...s].slice(-2000)));
  } catch {}
  listeners.forEach((l) => l());
}

/** Reactive set of seen bid ids for this account. */
export function useSeenBids(uid: string | undefined): Set<string> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (uid ? load(uid) : EMPTY),
    () => EMPTY
  );
}
const EMPTY = new Set<string>();

/** Has the owner looked at this bid? The database answers when it can; the browser otherwise. */
export function isBidUnseen(bid: Pick<Bid, "id" | "seenAt">, localSeen: Set<string>): boolean {
  if (bid.seenAt !== undefined) return bid.seenAt === null;
  return !localSeen.has(bid.id);
}
