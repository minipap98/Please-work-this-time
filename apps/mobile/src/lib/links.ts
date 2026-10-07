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
  "/vendor-dashboard": "/(vendor)/rfps",
  "/vendor-rfps": "/(vendor)/rfps",
  "/vendor-my-bids": "/(vendor)/my-bids",
  "/vendor-shop": "/(vendor)/profile",
  "/settings": "/settings",
  "/notifications": "/notifications",
};

const DYNAMIC: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^\/project\/([^/]+)$/, (m) => `/project/${m[1]}`],
  [/^\/vendor\/([^/]+)$/, (m) => `/vendor/${m[1]}`],
  [/^\/history\/([^/]+)$/, (m) => `/history/${m[1]}`],
];

/** Translate a web path (with optional query) into an app route. Unknown paths open the home screen. */
export function appRouteForWebPath(path: string): string {
  const [pathname, query] = path.split("?");
  const clean = pathname.replace(/\/+$/, "") || "/";
  const suffix = query ? `?${query}` : "";
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
