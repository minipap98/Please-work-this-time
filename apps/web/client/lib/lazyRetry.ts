import { lazy, type ComponentType } from "react";

/**
 * A tab that stayed open across a deploy still has the old index.html, which points at
 * chunk files the new build no longer serves. The first lazy import then fails
 * ("Failed to fetch dynamically imported module") and would crash the page.
 * Reload once to pick up the new build; if it still fails, surface the error.
 */
const FLAG = "bosun:chunk-reload";

export function lazyWithReload<T extends ComponentType<any>>(importer: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await importer();
      try { sessionStorage.removeItem(FLAG); } catch {}
      return mod;
    } catch (e) {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem(FLAG) === "1"; } catch {}
      if (!reloaded && typeof window !== "undefined") {
        try { sessionStorage.setItem(FLAG, "1"); } catch {}
        window.location.reload();
        // Keep the Suspense fallback up while the page reloads.
        return new Promise<{ default: T }>(() => {});
      }
      throw e;
    }
  });
}

/** Same recovery for Vite's own route preloads. Call once at startup. */
export function reloadOnStaleChunks() {
  window.addEventListener("vite:preloadError", (event) => {
    let reloaded = false;
    try { reloaded = sessionStorage.getItem(FLAG) === "1"; } catch {}
    if (reloaded) return;
    try { sessionStorage.setItem(FLAG, "1"); } catch {}
    event.preventDefault();
    window.location.reload();
  });
}
