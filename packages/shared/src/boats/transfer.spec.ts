import { describe, expect, it } from "vitest";
import { emailsMatch, isTransferExpired, isTransferLive, maskEmail, transferProblem, transferUrl } from "./transfer";

const now = new Date("2026-10-09T12:00:00Z");
const future = "2026-11-01T00:00:00Z";
const past = "2026-10-01T00:00:00Z";

describe("transfer links", () => {
  it("builds the link from the origin", () => {
    expect(transferUrl("https://getbosun.app", "abc")).toBe("https://getbosun.app/transfer/abc");
    expect(transferUrl("https://getbosun.app/", "abc")).toBe("https://getbosun.app/transfer/abc");
  });

  it("knows when a pending transfer has run out", () => {
    expect(isTransferExpired({ status: "pending", expiresAt: past }, now)).toBe(true);
    expect(isTransferExpired({ status: "pending", expiresAt: future }, now)).toBe(false);
    expect(isTransferExpired({ status: "accepted", expiresAt: past }, now)).toBe(false);
    expect(isTransferLive({ status: "pending", expiresAt: future }, now)).toBe(true);
    expect(isTransferLive({ status: "cancelled", expiresAt: future }, now)).toBe(false);
  });
});

describe("transferProblem", () => {
  const base = { status: "pending" as const, toEmail: "Buyer@Example.com", expiresAt: future };

  it("lets the named buyer accept, whatever the email's case", () => {
    expect(transferProblem(base, "buyer@example.com", now)).toBeNull();
    expect(transferProblem(base, " BUYER@example.com ", now)).toBeNull();
  });

  it("explains every other case", () => {
    expect(transferProblem(base, "other@example.com", now)).toMatch(/sent to Buyer@Example.com/);
    expect(transferProblem(base, null, now)).toMatch(/Sign in with that email/);
    expect(transferProblem({ ...base, expiresAt: past }, "buyer@example.com", now)).toMatch(/expired/);
    expect(transferProblem({ ...base, status: "expired" }, "buyer@example.com", now)).toMatch(/expired/);
    expect(transferProblem({ ...base, status: "accepted" }, "buyer@example.com", now)).toMatch(/already/);
    expect(transferProblem({ ...base, status: "cancelled" }, "buyer@example.com", now)).toMatch(/cancelled/);
  });
});

describe("email helpers", () => {
  it("matches case-insensitively and masks for display", () => {
    expect(emailsMatch("A@b.com", "a@B.COM")).toBe(true);
    expect(emailsMatch("a@b.com", "")).toBe(false);
    expect(maskEmail("ann@example.com")).toBe("a***@example.com");
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});
