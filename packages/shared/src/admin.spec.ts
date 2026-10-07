import { describe, expect, it } from "vitest";
import { areaName, demandCells, prospectScore, type DemandProject } from "./admin";

const job = (o: Partial<DemandProject>): DemandProject => ({
  id: "1", title: "Bottom paint", category: "Bottom work", status: "bidding", createdAt: "2026-10-01T00:00:00Z",
  lat: 26.12, lng: -80.14, location: "Fort Lauderdale", bids: 0, bidders: 0, ...o,
});

describe("admin demand", () => {
  it("names the nearest known town, or falls back to the job's text", () => {
    expect(areaName(26.12, -80.14, null)).toBe("Fort Lauderdale, FL");
    expect(areaName(45.0, -100.0, "Lake Oahe")).toBe("Lake Oahe");
    expect(areaName(45.0, -100.0, null)).toBe("45.0, -100.0");
  });

  it("ranks thin, busy areas first", () => {
    const now = new Date("2026-10-05");
    const cells = demandCells(
      [
        job({ id: "a" }), job({ id: "b", bidders: 1 }), job({ id: "c", bidders: 4, bids: 4 }),
        job({ id: "d", lat: 25.76, lng: -80.19, location: "Miami", category: "Engine", bidders: 5, bids: 6 }),
      ],
      now
    );
    expect(cells[0]).toMatchObject({ area: "Fort Lauderdale, FL", category: "Bottom work", jobs: 3, thin: 2, shopsBidding: 4, recentJobs: 3 });
    expect(cells[1]).toMatchObject({ area: "Miami, FL", category: "Engine", thin: 0 });
    expect(cells[0].score).toBeGreaterThan(cells[1].score);
  });

  it("scores prospects by nearby thin demand and how established they are", () => {
    const cells = demandCells([job({ id: "a" }), job({ id: "b" })]);
    const near = prospectScore({ rating: 4.8, reviewCount: 120, phone: "x", website: "y", status: "new", lat: 26.1, lng: -80.15 }, cells);
    const far = prospectScore({ rating: 4.8, reviewCount: 120, phone: "x", website: "y", status: "new", lat: 30.3, lng: -81.6 }, cells);
    expect(near.nearbyThinJobs).toBe(2);
    expect(near.score).toBeGreaterThan(far.score);
    expect(prospectScore({ rating: 5, reviewCount: 10, phone: "", website: "", status: "declined", lat: 26.1, lng: -80.15 }, cells).score).toBe(0);
  });
});
