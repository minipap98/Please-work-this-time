import { describe, expect, it } from "vitest";
import { bidProblem, normalizeBidExpiry, usableLineItems } from "./bids";

describe("bidProblem", () => {
  it("needs a positive total and a message", () => {
    expect(bidProblem({ price: 0, message: "hi" })).toBe("Bid total must be greater than $0.");
    expect(bidProblem({ price: 100, message: "   " })).toBe("Add a short message with your bid.");
    expect(bidProblem({ price: 100, message: "Friday works" })).toBeNull();
  });
});

describe("normalizeBidExpiry", () => {
  it("turns a picker date into the end of that local day", () => {
    const iso = normalizeBidExpiry("2026-09-01");
    expect(iso).not.toBeNull();
    const d = new Date(iso!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it("passes timestamps through and drops empty values", () => {
    expect(normalizeBidExpiry("2026-09-01T10:00:00.000Z")).toBe("2026-09-01T10:00:00.000Z");
    expect(normalizeBidExpiry(undefined)).toBeNull();
    expect(normalizeBidExpiry("")).toBeNull();
  });
});

describe("usableLineItems", () => {
  it("keeps priced, described lines and defaults quantity to 1", () => {
    expect(
      usableLineItems([
        { description: " Labor ", quantity: 0, unitPrice: 150 },
        { description: "", quantity: 1, unitPrice: 20 },
        { description: "Impeller", quantity: 2, unitPrice: 0 },
      ]),
    ).toEqual([{ description: "Labor", quantity: 1, unitPrice: 150 }]);
  });
});
