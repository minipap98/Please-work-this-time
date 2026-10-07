// Verified locations without a Google key: a US ZIP lookup (keyless), or the device's own position.
import * as Location from "expo-location";
import { zipToLocation, type PickedLocation } from "@bosun/shared/geo";

export function isZip(s: string): boolean {
  return /^\d{5}$/.test(s.trim());
}

/** City/state and coordinates for a 5-digit US ZIP, or null when it isn't one. */
export async function lookupZip(zip: string): Promise<PickedLocation | null> {
  const z = zip.trim();
  if (!isZip(z)) return null;
  const res = await fetch(`https://api.zippopotam.us/us/${z}`);
  if (!res.ok) return null;
  return zipToLocation(z, await res.json());
}

/** Where the phone is right now, or null when the owner said no. */
export async function deviceLocation(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** An Apple Maps link to a place (lat/lng, with a label). */
export function mapsUrl(lat: number, lng: number, label: string): string {
  return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label)}`;
}
