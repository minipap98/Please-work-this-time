// Turns what someone typed during onboarding into the rows the apps save. Pure; the apps do the saving.

import type { PickedLocation } from "./geo";
import { initials } from "./people";

export const ENGINE_COUNT_WORDS = ["Single", "Twin", "Triple", "Quad", "Quint", "Sextuple"] as const;

/** "Twin" → 2; anything unknown → 1. */
export function engineCountFromWord(word: string): number {
  return Math.max(1, (ENGINE_COUNT_WORDS as readonly string[]).indexOf(word) + 1);
}

export type EngineType = "Outboard" | "Inboard" | "I/O (Sterndrive)";

export interface VendorOnboardingForm {
  businessName: string;
  phone: string;
  yearsInBusiness: string;
  insured: boolean;
  licensed: boolean;
  specialties: string[];
  certifications: string[];
  serviceArea: string;
  bio: string;
  serviceRadiusMiles: number;
}

/** The `vendor_profiles` row for a new shop (location columns only when the shop placed itself). */
export function vendorProfileRow(userId: string, form: VendorOnboardingForm, place: PickedLocation | null) {
  return {
    user_id: userId,
    business_name: form.businessName.trim(),
    initials: initials(form.businessName),
    years_in_business: parseInt(form.yearsInBusiness) || 0,
    insured: form.insured,
    licensed: form.licensed,
    specialties: form.specialties,
    certifications: form.certifications,
    service_area: form.serviceArea.trim(),
    bio: form.bio.trim(),
    phone: form.phone.trim() || null,
    service_radius_miles: form.serviceRadiusMiles,
    ...(place ? { lat: place.lat, lng: place.lng, place_id: place.placeId } : {}),
  };
}

/** What the shop's own `profiles` row learns at the end of onboarding. */
export function vendorProfilePatch(form: VendorOnboardingForm, place: PickedLocation | null) {
  return {
    name: form.businessName.trim(),
    initials: initials(form.businessName),
    ...(place ? { location: place.label, location_lat: place.lat, location_lng: place.lng, location_place_id: place.placeId } : {}),
    phone: form.phone.trim() || null,
    onboarding_complete: true as const,
  };
}

export interface OwnerBoatForm {
  make: string;
  model: string;
  year: string;
  name: string;
  engineType: string;
  engineMake: string;
  engineModel: string;
  /** One of ENGINE_COUNT_WORDS, or "". */
  engineCount: string;
}

export function hasBoatDetails(boat: OwnerBoatForm): boolean {
  return Boolean(boat.make || boat.model || boat.name);
}

/** The `boats` row for an owner's first boat, with "My Boat"/"Unknown"/this-year defaults. */
export function ownerBoatRow(userId: string, boat: OwnerBoatForm, homePortLabel: string, place: PickedLocation | null, now: Date = new Date()) {
  return {
    owner_id: userId,
    name: boat.name || "My Boat",
    make: boat.make || "Unknown",
    model: boat.model || "Unknown",
    year: boat.year || String(now.getFullYear()),
    engine_type: (boat.engineType || null) as EngineType | null,
    engine_make: boat.engineMake || null,
    engine_model: boat.engineModel || null,
    engine_count: engineCountFromWord(boat.engineCount),
    home_port: homePortLabel.trim() || null,
    ...(place ? { home_port_lat: place.lat, home_port_lng: place.lng, home_port_place_id: place.placeId } : {}),
  };
}

/** What the owner's `profiles` row learns at the end of onboarding. */
export function ownerProfilePatch(homePortLabel: string, place: PickedLocation | null) {
  const location = homePortLabel.trim();
  return {
    ...(location
      ? {
          location,
          ...(place ? { location_lat: place.lat, location_lng: place.lng, location_place_id: place.placeId } : {}),
        }
      : {}),
    onboarding_complete: true as const,
  };
}
