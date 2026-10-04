// Loads the Google Maps JS API once, with the modern async loader.
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

let ready: Promise<void> | null = null;

// Google calls window.gm_authFailure when the key can't be used for maps (API not enabled,
// key restricted, billing off). Components listen so they can hide the map instead of
// showing Google's error panel.
export const MAPS_FAILED_EVENT = "bosun:maps-failed";
let mapsFailed = false;
export function mapsRenderFailed(): boolean {
  return mapsFailed;
}
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  mapsFailed = true;
  window.dispatchEvent(new Event(MAPS_FAILED_EVENT));
};

export const googleMapsConfigured = !!API_KEY;

export function loadGoogleMaps(): Promise<void> {
  if (!API_KEY) return Promise.reject(new Error("Google Maps isn't configured"));
  if ((window as unknown as { google?: { maps?: { importLibrary?: unknown } } }).google?.maps?.importLibrary) {
    return Promise.resolve();
  }
  if (ready) return ready;
  ready = new Promise<void>((resolve, reject) => {
    const cb = "__bosunMapsReady";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&loading=async&callback=${cb}`;
    script.async = true;
    script.onerror = () => {
      ready = null;
      reject(new Error("Couldn't load Google Maps"));
    };
    document.head.appendChild(script);
  });
  return ready;
}

/** Load the API plus the libraries a component needs (maps, marker, places…). */
export async function googleLibraries(...names: string[]): Promise<void> {
  await loadGoogleMaps();
  await Promise.all(names.map((n) => google.maps.importLibrary(n)));
}
