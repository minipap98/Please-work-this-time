import { describe, expect, it } from "vitest";
import { isExpoPushToken, pushMessageFor } from "./push";

describe("pushMessageFor", () => {
  it("carries the job and the route the bell would open", () => {
    const msg = pushMessageFor(
      { id: "n1", type: "bid_received", title: "New bid on Impeller", body: "Harbor Marine bid $850", data: { project_id: "p1", bid_id: "b1" } },
      "owner",
    );
    expect(msg).toEqual({
      title: "New bid on Impeller",
      body: "Harbor Marine bid $850",
      data: { notification_id: "n1", type: "bid_received", project_id: "p1", bid_id: "b1", url: "/project/p1" },
    });
  });

  it("falls back by role and tolerates missing data", () => {
    const msg = pushMessageFor({ id: "n2", type: "message", title: "New message", body: null, data: null }, "vendor");
    expect(msg.body).toBe("");
    expect(msg.data).toEqual({ notification_id: "n2", type: "message", url: "/vendor-my-bids" });
  });
});

describe("isExpoPushToken", () => {
  it("recognises Expo tokens only", () => {
    expect(isExpoPushToken("ExponentPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("apns:abc")).toBe(false);
  });
});
