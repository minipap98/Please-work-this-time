import { describe, expect, it } from "vitest";
import type { PickedLocation } from "./geo";
import { engineCountFromWord, ownerBoatRow, ownerProfilePatch, vendorProfilePatch, vendorProfileRow } from "./onboarding";

const place: PickedLocation = { label: "Rickenbacker Marina, Key Biscayne, FL", address: null, lat: 25.73, lng: -80.17, placeId: "pl1", source: "google" };

describe("engineCountFromWord", () => {
  it("maps the words and defaults to one engine", () => {
    expect(engineCountFromWord("Single")).toBe(1);
    expect(engineCountFromWord("Twin")).toBe(2);
    expect(engineCountFromWord("Quad")).toBe(4);
    expect(engineCountFromWord("")).toBe(1);
  });
});

describe("vendorProfileRow / vendorProfilePatch", () => {
  const form = {
    businessName: " Harbor Marine ",
    phone: " 305-555-0100 ",
    yearsInBusiness: "12",
    insured: true,
    licensed: false,
    specialties: ["Engine Service"],
    certifications: [],
    serviceArea: "Miami ",
    bio: " Outboards. ",
    serviceRadiusMiles: 25,
  };

  it("trims text, derives initials and adds location columns only when placed", () => {
    const row = vendorProfileRow("u1", form, place);
    expect(row).toMatchObject({
      user_id: "u1",
      business_name: "Harbor Marine",
      initials: "HM",
      years_in_business: 12,
      service_area: "Miami",
      bio: "Outboards.",
      phone: "305-555-0100",
      service_radius_miles: 25,
      lat: 25.73,
      lng: -80.17,
      place_id: "pl1",
    });
    expect(vendorProfileRow("u1", { ...form, yearsInBusiness: "", phone: "" }, null)).toMatchObject({ years_in_business: 0, phone: null });
    expect("lat" in vendorProfileRow("u1", form, null)).toBe(false);
  });

  it("completes onboarding on the profile with the shop's location as its location", () => {
    expect(vendorProfilePatch(form, place)).toEqual({
      name: "Harbor Marine",
      initials: "HM",
      location: place.label,
      location_lat: 25.73,
      location_lng: -80.17,
      location_place_id: "pl1",
      phone: "305-555-0100",
      onboarding_complete: true,
    });
  });
});

describe("ownerBoatRow / ownerProfilePatch", () => {
  const boat = { make: "", model: "", year: "", name: "", engineType: "Outboard", engineMake: "Yamaha", engineModel: "F200", engineCount: "Twin" };

  it("fills in defaults for an unnamed boat", () => {
    const row = ownerBoatRow("u1", boat, "Dinner Key", null, new Date("2026-08-01"));
    expect(row).toEqual({
      owner_id: "u1",
      name: "My Boat",
      make: "Unknown",
      model: "Unknown",
      year: "2026",
      engine_type: "Outboard",
      engine_make: "Yamaha",
      engine_model: "F200",
      engine_count: 2,
      home_port: "Dinner Key",
    });
  });

  it("records the verified home port and completes onboarding", () => {
    expect(ownerBoatRow("u1", boat, place.label, place)).toMatchObject({ home_port_lat: 25.73, home_port_place_id: "pl1" });
    expect(ownerProfilePatch(place.label, place)).toMatchObject({ location: place.label, location_lat: 25.73, onboarding_complete: true });
    expect(ownerProfilePatch("  ", null)).toEqual({ onboarding_complete: true });
  });
});
