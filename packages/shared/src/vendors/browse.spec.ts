import { describe, expect, it } from "vitest";
import type { Tables } from "../database.types";
import { DEFAULT_VENDOR_FILTERS, browseOrigin, filterVendors, specialtyOptions, vendorCard } from "./browse";

const row = (p: Partial<Tables<"vendor_profiles">>): Tables<"vendor_profiles"> =>
  ({ id: "v", user_id: "u", business_name: "Dean's Marine", initials: "", specialties: ["Outboard service"], certifications: [], insured: true, licensed: false, years_in_business: 12, completed_jobs: 40, response_time: "1 hour", service_area: "Miami", bio: "", phone: null, website: null, lat: 25.7, lng: -80.2, verified_at: null, ...p }) as unknown as Tables<"vendor_profiles">;

const origin = { lat: 25.73, lng: -80.17 };

describe("vendor cards", () => {
  it("maps a row, makes initials and measures the distance from the origin", () => {
    const c = vendorCard(row({}), origin);
    expect(c.initials).toBe("DE");
    expect(c.distance).toBeGreaterThan(2);
    expect(c.distance).toBeLessThan(4);
    expect(vendorCard(row({ lat: null, lng: null }), origin).distance).toBeNull();
  });

  it("filters by text, specialty, insurance and radius, then sorts by distance", () => {
    const cards = [
      vendorCard(row({ id: "near" }), origin),
      vendorCard(row({ id: "far", business_name: "Keys Diesel", specialties: ["Diesel"], lat: 24.56, lng: -81.78, insured: false }), origin),
      vendorCard(row({ id: "nowhere", business_name: "No Pin", lat: null, lng: null }), origin),
    ];
    expect(filterVendors(cards, DEFAULT_VENDOR_FILTERS, true).map((c) => c.id)).toEqual(["near", "nowhere"]);
    expect(filterVendors(cards, { ...DEFAULT_VENDOR_FILTERS, radiusMiles: Infinity }, true).map((c) => c.id)).toEqual(["near", "far", "nowhere"]);
    expect(filterVendors(cards, { ...DEFAULT_VENDOR_FILTERS, radiusMiles: Infinity, search: "diesel" }, true).map((c) => c.id)).toEqual(["far"]);
    expect(filterVendors(cards, { ...DEFAULT_VENDOR_FILTERS, radiusMiles: Infinity, insuredOnly: true }, true).map((c) => c.id)).toEqual(["near", "nowhere"]);
    expect(filterVendors(cards, { ...DEFAULT_VENDOR_FILTERS, specialty: "Diesel", radiusMiles: Infinity }, true).map((c) => c.id)).toEqual(["far"]);
    expect(specialtyOptions(cards)).toEqual(["Diesel", "Outboard service"]);
  });

  it("ignores the radius and falls back to a jobs sort without an origin", () => {
    const cards = [vendorCard(row({ id: "a", completed_jobs: 2 }), null), vendorCard(row({ id: "b", completed_jobs: 9 }), null)];
    expect(filterVendors(cards, DEFAULT_VENDOR_FILTERS, false).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("measures from the boat first, then the owner's own location", () => {
    expect(browseOrigin({ home_port_lat: 1, home_port_lng: 2 }, { location_lat: 3, location_lng: 4 })).toMatchObject({ lat: 1, lng: 2, label: "Your boat" });
    expect(browseOrigin({ home_port_lat: null, home_port_lng: null }, { location_lat: 3, location_lng: 4 })).toMatchObject({ lat: 3, lng: 4, label: "You" });
    expect(browseOrigin(null, null)).toBeNull();
  });
});
