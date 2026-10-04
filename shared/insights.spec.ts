import { describe, expect, it } from "vitest";
import { headline, median, summarizeMarket, type MyBidStat } from "./insights";

const bid = (p: Partial<MyBidStat>): MyBidStat => ({
  category: "Engine Service", price: 1000, peerMedian: null, lowest: null, decided: true, won: false, ...p,
});

describe("vendor market insights", () => {
  it("compares price on the same jobs and splits win rate by lowest bid", () => {
    const s = summarizeMarket({
      mine: [
        bid({ price: 900, peerMedian: 1000, lowest: true, won: true }),
        bid({ price: 950, peerMedian: 1000, lowest: true, won: true }),
        bid({ price: 1100, peerMedian: 1000, lowest: false }),
        bid({ price: 1200, peerMedian: 1000, lowest: false }),
        bid({ price: 1150, peerMedian: 1000, lowest: false, won: true }),
        bid({ price: 1300, peerMedian: 1000, lowest: true, won: true }),
        bid({ category: "Detailing", price: 400, decided: false }),
      ],
      market: [{ category: "Engine Service", vendors: 5, bids: 40, decided: 30, wins: 6, medianPrice: 1000 }],
    });
    expect(s.bids).toBe(7);
    expect(s.decided).toBe(6);
    expect(s.winRate).toBeCloseTo(4 / 6);
    expect(s.marketWinRate).toBeCloseTo(0.2);
    expect(s.headToHead).toBe(6);
    expect(s.priceVsMarket).toBeCloseTo(0.125);
    expect(s.winRateWhenLowest).toBe(1);
    expect(s.winRateWhenNotLowest).toBeCloseTo(1 / 3);
    expect(s.categories[0]).toMatchObject({ category: "Engine Service", bids: 6, marketShops: 5, marketMedianPrice: 1000 });
    expect(s.categories[0].priceVsMarket).toBeCloseTo(0.125);
    expect(headline(s)).toContain("you win 100% when you're the lowest bid");
  });

  it("shows nothing it can't back up", () => {
    const s = summarizeMarket({ mine: [bid({ won: true }), bid({})], market: [] });
    expect(s.winRate).toBeNull();
    expect(s.priceVsMarket).toBeNull();
    expect(s.categories[0].marketWinRate).toBeNull();
    expect(headline(s)).toBeNull();
  });

  it("takes the median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
