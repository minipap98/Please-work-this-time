import { describe, expect, it } from "vitest";
import { buildThreads } from "./inbox";
import type { Bid, Project } from "./types";

const bid = (id: string, thread: Bid["thread"]): Bid => ({
  id,
  vendorName: "Harbor Marine",
  vendorInitials: "HM",
  rating: 0,
  reviewCount: 0,
  message: "",
  price: 100,
  submittedDate: "",
  expiryDate: "",
  thread,
});

const project = (id: string, bids: Bid[]): Project => ({ id, title: id, description: "", status: "bidding", date: "", bids });

describe("buildThreads", () => {
  const quiet = bid("quiet", []);
  const older = bid("older", [
    { from: "vendor", text: "Hi", time: "2026-08-01T10:00:00Z" },
    { from: "user", text: "Hello", time: "2026-08-01T11:00:00Z" },
  ]);
  const newer = bid("newer", [
    { from: "vendor", text: "Tuesday?", time: "2026-08-02T10:00:00Z" },
    { from: "vendor", text: "Or Wednesday", time: "2026-08-02T10:05:00Z" },
  ]);

  it("skips bids without messages and sorts newest first", () => {
    const threads = buildThreads([project("a", [older, quiet]), project("b", [newer])], { readCount: () => 0 });
    expect(threads.map((t) => t.bid.id)).toEqual(["newer", "older"]);
  });

  it("counts the other side's messages past what was already read", () => {
    const threads = buildThreads([project("b", [newer])], { readCount: (id) => (id === "newer" ? 1 : 0) });
    expect(threads[0].unreadCount).toBe(1);
  });

  it("lets a shop count the owner's messages instead", () => {
    const threads = buildThreads([project("a", [older])], { readCount: () => 0, from: "user" });
    expect(threads[0].unreadCount).toBe(1);
  });
});

describe("buildThreads with live read receipts", () => {
  it("counts messages sent to me that I haven't read, ignoring the browser index", () => {
    const live = bid("live", [
      { from: "vendor", text: "Hi", time: "2026-08-01T10:00:00Z", recipientId: "owner", read: true },
      { from: "vendor", text: "Still there?", time: "2026-08-01T11:00:00Z", recipientId: "owner", read: false },
      { from: "user", text: "Yes", time: "2026-08-01T12:00:00Z", recipientId: "vendor", read: false },
    ]);
    const owner = buildThreads([project("a", [live])], { userId: "owner", readCount: () => 99 });
    expect(owner[0].unreadCount).toBe(1);
    const shop = buildThreads([project("a", [live])], { userId: "vendor" });
    expect(shop[0].unreadCount).toBe(1);
  });
});
