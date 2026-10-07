import { describe, expect, it } from "vitest";
import { safeNextPath, signUpOptions, signupProblem } from "./auth";

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
