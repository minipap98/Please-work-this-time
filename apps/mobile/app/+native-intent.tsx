import { appRouteForWebPath } from "@/lib/links";

/** Universal links arrive as getbosun.app paths; translate them to this app's routes. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return appRouteForWebPath(path);
}
