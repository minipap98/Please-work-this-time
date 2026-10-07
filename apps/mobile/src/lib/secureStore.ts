// The Keychain, with a fallback. A simulator build without entitlements (xcodebuild with
// CODE_SIGNING_ALLOWED=NO) is refused Keychain access ("A required entitlement is not present");
// rather than break sign-in, values then live in memory for this run and the app says so once.
import * as SecureStore from "expo-secure-store";
import type { KeyValueStore } from "./chunkedStore";

const memory = new Map<string, string>();
let keychainBroken = false;

function fallback(err: unknown): void {
  if (!keychainBroken) {
    keychainBroken = true;
    console.warn("Keychain unavailable; keeping the session in memory for this run. Build the app signed (CODE_SIGN_IDENTITY=-) to persist it.", err instanceof Error ? err.message : err);
  }
}

/** True once the Keychain refused us; the session won't survive a restart. */
export function isKeychainBroken(): boolean {
  return keychainBroken;
}

export const secureStore: KeyValueStore = {
  async get(key) {
    if (keychainBroken) return memory.get(key) ?? null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      fallback(e);
      return memory.get(key) ?? null;
    }
  },
  async set(key, value) {
    memory.set(key, value);
    if (keychainBroken) return;
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      fallback(e);
    }
  },
  async remove(key) {
    memory.delete(key);
    if (keychainBroken) return;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      fallback(e);
    }
  },
};
