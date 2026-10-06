import { useSyncExternalStore } from "react";

/**
 * Which bids the owner has already looked at, kept in this browser per account.
 * A bid counts as seen once its job's detail page has been opened.
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
