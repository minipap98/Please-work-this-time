import { describe, expect, it } from "vitest";
import {
  communityKey, excerpt, groupLabel, groupPath, isGroupable, lastActivity, postPath, postProblem, replyProblem, titleFromKey,
  POST_BODY_MAX, POST_TITLE_MAX, REPLY_BODY_MAX,
} from "./community";

describe("communityKey", () => {
  it("matches community_key() in SQL", () => {
    expect(communityKey("Sea Ray")).toBe("sea-ray");
    expect(communityKey("DC 326")).toBe("dc-326");
    expect(communityKey("  SDX 250 OB ")).toBe("sdx-250-ob");
    expect(communityKey("Grady-White")).toBe("grady-white");
    expect(communityKey("Boston Whaler 23' Outrage")).toBe("boston-whaler-23-outrage");
    expect(communityKey("")).toBe("");
    expect(communityKey(null)).toBe("");
  });

  it("treats spelling and case differences as the same group", () => {
    expect(communityKey("SEA RAY")).toBe(communityKey("sea ray"));
    expect(communityKey("DC-326")).toBe(communityKey("DC 326"));
  });
});

describe("groups", () => {
  it("won't form a group from a blank or Unknown boat", () => {
    expect(isGroupable("Pursuit")).toBe(true);
    expect(isGroupable("Pursuit", "DC 326")).toBe(true);
    expect(isGroupable("Unknown")).toBe(false);
    expect(isGroupable("")).toBe(false);
    expect(isGroupable("Pursuit", "Unknown")).toBe(false);
    expect(isGroupable("Pursuit", "")).toBe(false);
  });

  it("builds paths from names or keys", () => {
    expect(groupPath("Pursuit")).toBe("/owners/pursuit");
    expect(groupPath("Pursuit", "DC 326")).toBe("/owners/pursuit/dc-326");
    expect(groupPath("pursuit", "dc-326")).toBe("/owners/pursuit/dc-326");
    expect(groupPath("Pursuit", null)).toBe("/owners/pursuit");
    expect(postPath("abc")).toBe("/owners/post/abc");
  });

  it("labels a group", () => {
    expect(groupLabel({ make: "Pursuit", model: "DC 326" })).toBe("Pursuit DC 326 owners");
    expect(groupLabel({ make: "Pursuit", model: null })).toBe("Pursuit owners");
    expect(titleFromKey("sea-ray")).toBe("Sea Ray");
    expect(titleFromKey("dc-326")).toBe("Dc 326");
  });
});

describe("validation", () => {
  it("checks a post before it's sent", () => {
    expect(postProblem({ title: "Livewell pump", body: "Anyone replaced theirs?" })).toBeNull();
    expect(postProblem({ title: "Hi", body: "x" })).toMatch(/title/);
    expect(postProblem({ title: "a".repeat(POST_TITLE_MAX + 1), body: "x" })).toMatch(/under/);
    expect(postProblem({ title: "Fine title", body: "   " })).toMatch(/Write/);
    expect(postProblem({ title: "Fine title", body: "x".repeat(POST_BODY_MAX + 1) })).toMatch(/under/);
  });

  it("checks a reply", () => {
    expect(replyProblem("Mine went at 300 hours.")).toBeNull();
    expect(replyProblem("  ")).toMatch(/Write/);
    expect(replyProblem("x".repeat(REPLY_BODY_MAX + 1))).toMatch(/under/);
  });
});

describe("display helpers", () => {
  it("shortens a body to one line", () => {
    expect(excerpt("line one\n\nline   two")).toBe("line one line two");
    expect(excerpt("a".repeat(200), 20)).toHaveLength(20);
    expect(excerpt("a".repeat(200), 20).endsWith("…")).toBe(true);
  });

  it("sorts by the latest reply when there is one", () => {
    expect(lastActivity({ createdAt: "2026-10-01T00:00:00Z", lastReplyAt: "2026-10-05T00:00:00Z" })).toBe("2026-10-05T00:00:00Z");
    expect(lastActivity({ createdAt: "2026-10-01T00:00:00Z", lastReplyAt: null })).toBe("2026-10-01T00:00:00Z");
  });
});
