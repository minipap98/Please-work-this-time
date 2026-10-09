import { describe, expect, it } from "vitest";
import { isUnconfirmedEmailError, passwordProblem, resetPasswordRedirect, safeNextPath, signUpOptions, signupProblem } from "./auth";

describe("signupProblem", () => {
  it("needs a name and a 6+ character password", () => {
    expect(signupProblem({ name: " ", password: "secret1" })).toBe("Please enter your name.");
    expect(signupProblem({ name: "Jane", password: "12345" })).toBe("Password must be at least 6 characters.");
    expect(signupProblem({ name: "Jane", password: "123456" })).toBeNull();
  });
});

describe("signUpOptions", () => {
  it("sends name and role as user metadata", () => {
    expect(signUpOptions("Jane", "vendor", "https://getbosun.app/login")).toEqual({
      data: { name: "Jane", role: "vendor" },
      emailRedirectTo: "https://getbosun.app/login",
    });
    expect(signUpOptions("Jane", "owner")).toEqual({ data: { name: "Jane", role: "owner" } });
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths only", () => {
    expect(safeNextPath("/tech")).toBe("/tech");
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});

describe("password reset helpers", () => {
  it("builds the reset link from the site origin", () => {
    expect(resetPasswordRedirect("https://getbosun.app")).toBe("https://getbosun.app/reset-password");
    expect(resetPasswordRedirect("https://getbosun.app/")).toBe("https://getbosun.app/reset-password");
  });

  it("recognises Supabase's unconfirmed-email refusal", () => {
    expect(isUnconfirmedEmailError("Email not confirmed")).toBe(true);
    expect(isUnconfirmedEmailError("Invalid login credentials")).toBe(false);
    expect(isUnconfirmedEmailError(null)).toBe(false);
  });

  it("checks a new password and its confirmation", () => {
    expect(passwordProblem("12345")).toBe("Password must be at least 6 characters.");
    expect(passwordProblem("123456", "123457")).toBe("The two passwords don't match.");
    expect(passwordProblem("123456", "123456")).toBeNull();
    expect(passwordProblem("123456")).toBeNull();
  });
});
