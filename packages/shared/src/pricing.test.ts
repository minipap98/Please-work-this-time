import { describe, expect, it } from "vitest";
import { firstYearFees, jobFee } from "./pricing";

describe("new-customer fee", () => {
  it("takes 10% of a typical first job", () => {
    expect(jobFee(1500, 0, true)).toBe(150);
  });

  it("drops to 5% for the rest of the first year", () => {
    expect(firstYearFees([1500, 1500])).toEqual([150, 75]);
  });

  it("caps the 10% band at the first $10,000 of a big first job", () => {
    // 10% of 10,000 + 5% of 5,000
    expect(jobFee(15_000, 0, true)).toBe(1250);
  });

  it("steps down as the customer's first-year total grows", () => {
    // 10% of 10k, 5% to 25k, 2.5% to 50k, 1.5% to 100k, 1% after
    expect(jobFee(30_000, 0, true)).toBe(1000 + 750 + 125);
    expect(firstYearFees([10_000, 15_000, 25_000, 50_000, 20_000])).toEqual([1000, 750, 625, 750, 200]);
  });

  it("charges nothing on a zero or negative amount", () => {
    expect(jobFee(0, 0, true)).toBe(0);
    expect(jobFee(-5, 100, false)).toBe(0);
  });
});
