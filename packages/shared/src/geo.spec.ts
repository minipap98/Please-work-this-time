import { describe, expect, it } from "vitest";
import { approximate, distanceMiles, formatMiles, hasCoords, zipToLocation } from "./geo";

describe("geo", () => {
  it("measures miles between two points", () => {
    // Miami to Fort Lauderdale is about 25 miles as the crow flies.
    const d = distanceMiles({ lat: 25.7617, lng: -80.1918 }, { lat: 26.1224, lng: -80.1373 });
    expect(d).toBeGreaterThan(24);
    expect(d).toBeLessThan(26);
    expect(distanceMiles({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });

  it("rounds coordinates for privacy and formats distance", () => {
    expect(approximate(25.761734)).toBe(25.76);
    expect(formatMiles(0.4)).toBe("under 1 mi");
    expect(formatMiles(3)).toBe("3 mi");
    expect(formatMiles(3.46)).toBe("3.5 mi");
    expect(formatMiles(24.6)).toBe("25 mi");
    expect(hasCoords({ lat: 1, lng: null })).toBe(false);
  });

  it("reads a ZIP lookup", () => {
    const loc = zipToLocation("33149", {
      places: [{ "place name": "Key Biscayne", "state abbreviation": "FL", latitude: "25.6935", longitude: "-80.1628" }],
    });
    expect(loc).toEqual({ label: "Key Biscayne, FL 33149", address: null, lat: 25.6935, lng: -80.1628, placeId: null, source: "zip" });
    expect(zipToLocation("00000", {})).toBeNull();
  });
});
