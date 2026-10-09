import { describe, expect, it } from "vitest";
import { appRouteForUrl, appRouteForWebPath } from "./links";

describe("appRouteForWebPath", () => {
  it("maps the web's paths onto app routes", () => {
    expect(appRouteForWebPath("/project/abc")).toBe("/project/abc");
    expect(appRouteForWebPath("/vendor-rfps")).toBe("/(vendor)/rfps");
    expect(appRouteForWebPath("/vendor-my-bids")).toBe("/(vendor)/my-bids");
    expect(appRouteForWebPath("/app")).toBe("/(owner)");
    expect(appRouteForWebPath("/owners")).toBe("/owners");
    expect(appRouteForWebPath("/owners/post/abc")).toBe("/owners/post/abc");
    expect(appRouteForWebPath("/owners/pursuit")).toBe("/owners/board?make=pursuit");
    expect(appRouteForWebPath("/owners/pursuit/dc-326")).toBe("/owners/board?make=pursuit&model=dc-326");
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
    expect(appRouteForWebPath("/transfer/tok")).toBe("/transfer/tok");
  });

  it("opens the shop screens the web keeps under /vendor-shop tabs", () => {
    expect(appRouteForWebPath("/vendor-dashboard")).toBe("/(vendor)");
    expect(appRouteForWebPath("/vendor-shop")).toBe("/(vendor)/shop");
    expect(appRouteForWebPath("/vendor-shop?tab=orders")).toBe("/shop/orders");
    expect(appRouteForWebPath("/vendor-shop?tab=orders&wo=abc")).toBe("/shop/order/abc");
    expect(appRouteForWebPath("/vendor-shop?tab=orders&new=wo")).toBe("/shop/order/new");
    expect(appRouteForWebPath("/vendor-shop?tab=schedule")).toBe("/shop/schedule");
    expect(appRouteForWebPath("/vendor-shop?tab=parts")).toBe("/shop/parts");
    expect(appRouteForWebPath("/vendor-shop?tab=quickbooks")).toBe("/(vendor)/shop");
    expect(appRouteForWebPath("/vendor-insights?tab=insurance")).toBe("/shop/insights?tab=insurance");
    expect(appRouteForWebPath("/vendor-revenue")).toBe("/shop/revenue");
    expect(appRouteForWebPath("/tech")).toBe("/tech");
    expect(appRouteForWebPath("/crew-shop")).toBe("/shop/orders");
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
