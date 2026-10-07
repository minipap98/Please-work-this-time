import { describe, expect, it } from "vitest";
import { appRouteForUrl, appRouteForWebPath } from "./links";

describe("appRouteForWebPath", () => {
  it("maps the web's paths onto app routes", () => {
    expect(appRouteForWebPath("/project/abc")).toBe("/project/abc");
    expect(appRouteForWebPath("/vendor-rfps")).toBe("/(vendor)/rfps");
    expect(appRouteForWebPath("/vendor-my-bids")).toBe("/(vendor)/my-bids");
    expect(appRouteForWebPath("/app")).toBe("/(owner)");
    expect(appRouteForWebPath("/inbox?bid=1")).toBe("/inbox?bid=1");
    expect(appRouteForWebPath("/history/tok")).toBe("/(owner)");
    expect(appRouteForWebPath("/something-else")).toBe("/(owner)");
  });
});

describe("appRouteForUrl", () => {
  it("handles universal links and the custom scheme", () => {
    expect(appRouteForUrl("https://getbosun.app/project/abc")).toBe("/project/abc");
    expect(appRouteForUrl("https://www.getbosun.app/vendor-my-bids/")).toBe("/(vendor)/my-bids");
    expect(appRouteForUrl("bosun://project/abc")).toBe("/project/abc");
    expect(appRouteForUrl("/inbox")).toBe("/inbox");
  });
});
