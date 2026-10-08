// getbosun.app paths (what the web, emails and push notifications use) → this app's routes.

const EXACT: Record<string, string> = {
  "/": "/",
  "/app": "/(owner)",
  "/login": "/login",
  "/inbox": "/inbox",
  "/my-boats": "/(owner)/boats",
  "/boat-log": "/boat-log",
  "/maintenance": "/maintenance",
  "/vendors": "/(owner)/shops",
  "/vendor-dashboard": "/(vendor)",
  "/vendor-rfps": "/(vendor)/rfps",
  "/vendor-my-bids": "/(vendor)/my-bids",
  "/vendor-insights": "/shop/insights",
  "/vendor-business": "/shop/insights",
  "/vendor-revenue": "/shop/revenue",
  "/tech": "/tech",
  "/crew-shop": "/shop/orders",
  "/settings": "/settings",
  "/notifications": "/notifications",
};

/** The Shop OS tabs on the web (`/vendor-shop?tab=…`) are separate screens here. */
const SHOP_TABS: Record<string, string> = {
  orders: "/shop/orders",
  schedule: "/shop/schedule",
  customers: "/shop/customers",
  inventory: "/shop/inventory",
  parts: "/shop/parts",
  settings: "/shop/settings",
  quickbooks: "/(vendor)/shop",
};

const DYNAMIC: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^\/project\/([^/]+)$/, (m) => `/project/${m[1]}`],
  [/^\/vendor\/([^/]+)$/, (m) => `/vendor/${m[1]}`],
  [/^\/history\/([^/]+)$/, (m) => `/history/${m[1]}`],
];

function shopRoute(query: string | undefined): string {
  const q = new URLSearchParams(query ?? "");
  const wo = q.get("wo");
  if (wo) return `/shop/order/${wo}`;
  if (q.get("new") === "wo") return "/shop/order/new";
  const tab = q.get("tab");
  return (tab && SHOP_TABS[tab]) || "/(vendor)/shop";
}

/** Translate a web path (with optional query) into an app route. Unknown paths open the home screen. */
export function appRouteForWebPath(path: string): string {
  const [pathname, query] = path.split("?");
  const clean = pathname.replace(/\/+$/, "") || "/";
  const suffix = query ? `?${query}` : "";
  if (clean === "/vendor-shop") return shopRoute(query);
  if (EXACT[clean]) return EXACT[clean] + suffix;
  for (const [re, to] of DYNAMIC) {
    const m = re.exec(clean);
    if (m) return to(m) + suffix;
  }
  return "/(owner)";
}

/** From a full URL (universal link) or a bare path. */
export function appRouteForUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "bosun:") return appRouteForWebPath(`/${u.host}${u.pathname}${u.search}`);
    return appRouteForWebPath(`${u.pathname}${u.search}`);
  } catch {
    return appRouteForWebPath(url.startsWith("/") ? url : `/${url}`);
  }
}
