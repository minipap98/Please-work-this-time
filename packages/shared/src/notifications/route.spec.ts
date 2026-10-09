import { describe, expect, it } from "vitest";
import { notificationRoute, relativeTime } from "./route";

describe("notificationRoute", () => {
  it("opens the job when the notification names one", () => {
    expect(notificationRoute({ project_id: "p1" }, "owner")).toBe("/project/p1");
    expect(notificationRoute({ project_id: "p1", bid_id: "b" }, "vendor")).toBe("/project/p1");
  });

  it("falls back by role", () => {
    expect(notificationRoute({ bid_id: "b" }, "vendor")).toBe("/vendor-my-bids");
    expect(notificationRoute(null, "owner")).toBe("/inbox");
    expect(notificationRoute(undefined, undefined)).toBe("/inbox");
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-08-02T12:00:00Z");
  it("rounds down to minutes, hours, days", () => {
    expect(relativeTime("2026-08-02T11:58:30Z", now)).toBe("1m ago");
    expect(relativeTime("2026-08-02T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-07-30T12:00:00Z", now)).toBe("3d ago");
    expect(relativeTime("2026-08-02T12:05:00Z", now)).toBe("0m ago");
  });
});

describe("boat transfer notifications", () => {
  it("open the transfer link for the buyer and My Boats for the seller", () => {
    expect(notificationRoute({ transfer_token: "tok" }, "owner")).toBe("/transfer/tok");
    expect(notificationRoute({ boat_id: "b1", accepted: true } as never, "owner")).toBe("/my-boats");
  });
});
