import { describe, expect, it } from "vitest";
import { isOpenForBids, rankOpenJobs } from "./rfpFeed";
import type { Project } from "./types";

const job = (over: Partial<Project>): Project => ({
  id: over.id ?? "p",
  title: "Job",
  description: "",
  status: "bidding",
  date: "",
  bids: [],
  ...over,
});

const shop = { lat: 26.1224, lng: -80.1373 }; // Fort Lauderdale

describe("isOpenForBids", () => {
  it("accepts gathering, bidding and active only", () => {
    expect(["gathering", "bidding", "active"].every(isOpenForBids)).toBe(true);
    expect(["in-progress", "completed", "expired"].some(isOpenForBids)).toBe(false);
  });
});

describe("rankOpenJobs", () => {
  const near = job({ id: "near", lat: 26.05, lng: -80.14 }); // Dania Beach, ~5 mi
  const far = job({ id: "far", lat: 25.76, lng: -80.19 }); // Miami, ~25 mi
  const nowhere = job({ id: "nowhere" });
  const closed = job({ id: "closed", status: "completed", lat: 26.12, lng: -80.13 });

  it("drops closed jobs, sorts by distance and keeps unplaceable jobs last", () => {
    const ranked = rankOpenJobs([far, nowhere, closed, near], { shop, limitMiles: null });
    expect(ranked.map((r) => r.p.id)).toEqual(["near", "far", "nowhere"]);
    expect(ranked[0].miles).toBeGreaterThan(4);
    expect(ranked[0].miles).toBeLessThan(6);
    expect(ranked[2].miles).toBeNull();
  });

  it("applies the radius but never hides a job it can't place", () => {
    const ranked = rankOpenJobs([far, nowhere, near], { shop, limitMiles: 10 });
    expect(ranked.map((r) => r.p.id)).toEqual(["near", "nowhere"]);
  });

  it("measures nothing without a shop location", () => {
    const ranked = rankOpenJobs([far, near], { shop: null, limitMiles: 10 });
    expect(ranked).toHaveLength(2);
    expect(ranked.every((r) => r.miles === null)).toBe(true);
  });

  it("uses fallback coordinates for jobs that only name a town", () => {
    const town = job({ id: "town", location: "Miami" });
    const ranked = rankOpenJobs([town], {
      shop,
      limitMiles: null,
      fallbackCoords: (p) => (p.location === "Miami" ? { lat: 25.7617, lng: -80.1918 } : undefined),
    });
    expect(ranked[0].miles).toBeGreaterThan(20);
  });
});
