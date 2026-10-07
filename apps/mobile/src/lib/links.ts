// getbosun.app paths (what the web, emails and push notifications use) → this app's routes.

const EXACT: Record<string, string> = {
  "/": "/",
  "/app": "/(owner)",
  "/login": "/login",
  "/inbox": "/inbox",
  "/vendor-dashboard": "/(vendor)/rfps",
  "/vendor-rfps": "/(vendor)/rfps",
  "/vendor-my-bids": "/(vendor)/my-bids",
  "/vendor-shop": "/(vendor)/profile",
  "/settings": "/settings",
  "/notifications": "/notifications",
};

/** Translate a web path (with optional query) into an app route. Unknown paths (and web-only pages like /history) open the home screen. */
export function appRouteForWebPath(path: string): string {
  const [pathname, query] = path.split("?");
  const clean = pathname.replace(/\/+$/, "") || "/";
  const suffix = query ? `?${query}` : "";
  if (EXACT[clean]) return EXACT[clean] + suffix;
  const project = /^\/project\/([^/]+)$/.exec(clean);
  if (project) return `/project/${project[1]}${suffix}`;
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
