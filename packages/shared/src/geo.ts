// Verified locations and distances.

export interface PickedLocation {
  /** What we show, e.g. "Rickenbacker Marina, Key Biscayne, FL". */
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  source: "google" | "zip";
}

const R_MILES = 3958.8;

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Two decimals is about 0.7 mile: close enough to match shops, not enough to find someone's slip. */
export function approximate(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMiles(mi: number): string {
  if (mi < 1) return "under 1 mi";
  return `${mi < 10 ? mi.toFixed(1).replace(/\.0$/, "") : Math.round(mi)} mi`;
}

export function hasCoords(p: { lat?: number | null; lng?: number | null } | null | undefined): p is { lat: number; lng: number } {
  return !!p && typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

/** US ZIP lookup response (api.zippopotam.us) → a picked location. */
export function zipToLocation(zip: string, data: unknown): PickedLocation | null {
  const place = (data as { places?: Record<string, string>[] })?.places?.[0];
  if (!place) return null;
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const city = place["place name"];
  const state = place["state abbreviation"];
  return { label: `${city}, ${state} ${zip}`, address: null, lat, lng, placeId: null, source: "zip" };
}
