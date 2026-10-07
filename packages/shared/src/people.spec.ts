import { describe, expect, it } from "vitest";
import { initials } from "./people";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Dean's Marine")).toBe("DM");
    expect(initials("harbor marine services")).toBe("HM");
    expect(initials("  jane ")).toBe("J");
    expect(initials("")).toBe("");
  });
});
