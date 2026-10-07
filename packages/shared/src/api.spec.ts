import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  isActiveProjectStatus,
  postLoginPath,
  validatePaymentCents,
} from "./api";

describe("payment amount validation", () => {
  it("converts dollars to cents without floating-point drift", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(100)).toBe(10000);
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
  });

  it("rejects non-numeric, too-small, and too-large amounts", () => {
    expect(validatePaymentCents(NaN).ok).toBe(false);
    expect(validatePaymentCents(0).ok).toBe(false);
    expect(validatePaymentCents(99).ok).toBe(false);
    expect(validatePaymentCents(5_000_001).ok).toBe(false);
    expect(validatePaymentCents(100)).toEqual({ ok: true, cents: 100 });
    expect(validatePaymentCents(5_000_000)).toEqual({ ok: true, cents: 5_000_000 });
  });
});

describe("routing helpers", () => {
  it("sends incomplete onboarding to /onboarding", () => {
    expect(postLoginPath("owner", false)).toBe("/onboarding");
    expect(postLoginPath("vendor", false)).toBe("/onboarding");
  });

  it("sends completed users to the right home", () => {
    expect(postLoginPath("vendor", true)).toBe("/vendor-dashboard");
    expect(postLoginPath("owner", true)).toBe("/app");
  });
});

describe("project status", () => {
  it("treats bidding and in-progress as active work", () => {
    expect(isActiveProjectStatus("bidding")).toBe(true);
    expect(isActiveProjectStatus("in-progress")).toBe(true);
    expect(isActiveProjectStatus("expired")).toBe(false);
    expect(isActiveProjectStatus("completed")).toBe(false);
  });
});
