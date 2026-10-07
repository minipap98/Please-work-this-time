// Find a shop: the card each vendor_profiles row becomes, and the filters and sorts the apps offer.

import type { Tables } from "../database.types";
import { distanceMiles, hasCoords } from "../geo";

export interface VendorCard {
  id: string;
  name: string;
  initials: string;
  responseTime: string;
  insured: boolean;
  licensed: boolean;
  yearsInBusiness: number;
  specialties: string[];
  certifications: string[];
  serviceArea: string;
  bio: string;
  completedJobs: number;
  phone: string | null;
  website: string | null;
  verified: boolean;
  lat: number | null;
  lng: number | null;
  /** Miles from the origin, when both are known. */
  distance: number | null;
}

export function vendorCard(v: Tables<"vendor_profiles">, origin: { lat: number; lng: number } | null): VendorCard {
  const lat = v.lat ?? null;
  const lng = v.lng ?? null;
  return {
    id: v.id,
    name: v.business_name,
    initials: v.initials || v.business_name.slice(0, 2).toUpperCase(),
    responseTime: v.response_time ?? "—",
    insured: !!v.insured,
    licensed: !!v.licensed,
    yearsInBusiness: v.years_in_business ?? 0,
    specialties: v.specialties ?? [],
    certifications: v.certifications ?? [],
    serviceArea: v.service_area ?? "",
    bio: v.bio ?? "",
    completedJobs: v.completed_jobs ?? 0,
    phone: v.phone ?? null,
    website: v.website ?? null,
    verified: !!v.verified_at,
    lat,
    lng,
    distance: origin && hasCoords({ lat, lng }) ? distanceMiles(origin, { lat: lat!, lng: lng! }) : null,
  };
}

export type VendorSort = "distance" | "jobs" | "response" | "experience" | "name";

export const RADIUS_OPTIONS: { label: string; miles: number }[] = [
  { label: "20 mi", miles: 20 },
  { label: "50 mi", miles: 50 },
  { label: "100 mi", miles: 100 },
  { label: "Any distance", miles: Infinity },
];

export interface VendorFilters {
  search: string;
  specialty: string | null;
  insuredOnly: boolean;
  licensedOnly: boolean;
  /** Only applies when there's an origin. */
  radiusMiles: number;
  sort: VendorSort;
}

export const DEFAULT_VENDOR_FILTERS: VendorFilters = { search: "", specialty: null, insuredOnly: false, licensedOnly: false, radiusMiles: 20, sort: "distance" };

/** "30 min" → 30, "same day" → 1440, anything else → 9999 (sorts last). */
export function parseResponseMinutes(s: string): number {
  const t = s.toLowerCase();
  if (t.includes("30 min")) return 30;
  if (t.includes("1 hour")) return 60;
  if (t.includes("2 hour")) return 120;
  if (t.includes("4 hour")) return 240;
  if (t.includes("same day") || t.includes("24")) return 1440;
  return 9999;
}

export function filterVendors(cards: VendorCard[], f: VendorFilters, hasOrigin: boolean): VendorCard[] {
  const q = f.search.trim().toLowerCase();
  const kept = cards.filter((v) => {
    if (q && ![v.name, v.serviceArea, ...v.specialties, ...v.certifications].some((s) => s.toLowerCase().includes(q))) return false;
    if (f.specialty && !v.specialties.includes(f.specialty)) return false;
    if (f.insuredOnly && !v.insured) return false;
    if (f.licensedOnly && !v.licensed) return false;
    if (hasOrigin && Number.isFinite(f.radiusMiles) && v.distance != null && v.distance > f.radiusMiles) return false;
    return true;
  });
  const sort = f.sort === "distance" && !hasOrigin ? "jobs" : f.sort;
  return kept.sort((a, b) => {
    switch (sort) {
      case "distance":
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      case "jobs":
        return b.completedJobs - a.completedJobs;
      case "response":
        return parseResponseMinutes(a.responseTime) - parseResponseMinutes(b.responseTime);
      case "experience":
        return b.yearsInBusiness - a.yearsInBusiness;
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

/** Every specialty any listed shop offers, A–Z. */
export function specialtyOptions(cards: VendorCard[]): string[] {
  return [...new Set(cards.flatMap((v) => v.specialties))].sort((a, b) => a.localeCompare(b));
}

/** Where distances are measured from: the active boat's home port, else the owner's own location. */
export function browseOrigin(
  boat: { home_port_lat: number | null; home_port_lng: number | null } | null | undefined,
  profile: { location_lat: number | null; location_lng: number | null } | null | undefined,
): { lat: number; lng: number; label: "Your boat" | "You" } | null {
  if (boat && boat.home_port_lat != null && boat.home_port_lng != null) return { lat: boat.home_port_lat, lng: boat.home_port_lng, label: "Your boat" };
  if (profile && profile.location_lat != null && profile.location_lng != null) return { lat: profile.location_lat, lng: profile.location_lng, label: "You" };
  return null;
}
