import { describe, expect, it } from "vitest";
import { appRouteForUrl, appRouteForWebPath } from "./links";

describe("appRouteForWebPath", () => {
  it("maps the web's paths onto app routes", () => {
    expect(appRouteForWebPath("/project/abc")).toBe("/project/abc");
    expect(appRouteForWebPath("/vendor-rfps")).toBe("/(vendor)/rfps");
    expect(appRouteForWebPath("/vendor-my-bids")).toBe("/(vendor)/my-bids");
    expect(appRouteForWebPath("/app")).toBe("/(owner)");
    expect(appRouteForWebPath("/inbox?bid=1")).toBe("/inbox?bid=1");
    expect(appRouteForWebPath("/something-else")).toBe("/(owner)");
  });

  it("opens the owner pages that moved into the app", () => {
    expect(appRouteForWebPath("/my-boats")).toBe("/(owner)/boats");
    expect(appRouteForWebPath("/boat-log?share=1")).toBe("/boat-log?share=1");
    expect(appRouteForWebPath("/maintenance?setup=1")).toBe("/maintenance?setup=1");
    expect(appRouteForWebPath("/vendors")).toBe("/(owner)/shops");
    expect(appRouteForWebPath("/vendor/1234")).toBe("/vendor/1234");
    expect(appRouteForWebPath("/history/tok")).toBe("/history/tok");
  });
});

describe("appRouteForUrl", () => {
  it("handles universal links and the custom scheme", () => {
    expect(appRouteForUrl("https://getbosun.app/project/abc")).toBe("/project/abc");
    expect(appRouteForUrl("https://www.getbosun.app/vendor-my-bids/")).toBe("/(vendor)/my-bids");
    expect(appRouteForUrl("https://getbosun.app/history/tok")).toBe("/history/tok");
    expect(appRouteForUrl("bosun://project/abc")).toBe("/project/abc");
    expect(appRouteForUrl("/inbox")).toBe("/inbox");
  });
});
