// Small per-device preferences (the active boat, an engine-hours override). Kept in the
// Keychain store we already have so no extra native module is needed; none of it is secret.
import * as SecureStore from "expo-secure-store";
import { useCallback, useSyncExternalStore } from "react";

const cache = new Map<string, string | null>();
const listeners = new Set<() => void>();
const loading = new Map<string, Promise<void>>();

function notify() {
  listeners.forEach((l) => l());
}

function load(key: string): Promise<void> {
  let p = loading.get(key);
  if (!p) {
    p = SecureStore.getItemAsync(key)
      .then((v) => {
        cache.set(key, v);
      })
      .catch(() => {
        cache.set(key, null);
      })
      .then(notify);
    loading.set(key, p);
  }
  return p;
}

export async function setPref(key: string, value: string | null): Promise<void> {
  cache.set(key, value);
  notify();
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // The value still applies for this session.
  }
}

/** The stored value (null while loading or when unset) and a setter. */
export function usePref(key: string | null): [string | null, (v: string | null) => Promise<void>] {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (!key) return null;
      if (!cache.has(key)) {
        load(key);
        return null;
      }
      return cache.get(key) ?? null;
    },
  );
  const set = useCallback((v: string | null) => (key ? setPref(key, v) : Promise.resolve()), [key]);
  return [value, set];
}

export const activeBoatKey = (userId: string) => `bosun_primary_boat.${userId}`;
export const engineHoursKey = (userId: string, boatId: string) => `bosun_engine_hours.${userId}.${boatId}`;
