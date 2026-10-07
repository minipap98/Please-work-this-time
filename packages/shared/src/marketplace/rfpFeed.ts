// What a shop sees on "Jobs near you": open jobs, ranked by distance from the shop.

import { distanceMiles, hasCoords } from "../geo";
import type { Project, ProjectStatus } from "./types";

/** Statuses a shop can still bid on. (Mirrors the RLS policy that lets shops read open jobs.) */
export const OPEN_FOR_BIDS: readonly ProjectStatus[] = ["gathering", "bidding", "active"];

export function isOpenForBids(status: string): boolean {
  return (OPEN_FOR_BIDS as readonly string[]).includes(status);
}

/** A shop's default search radius when it hasn't set one. */
export const DEFAULT_SERVICE_RADIUS_MILES = 50;

export interface RankedJob<P extends Project = Project> {
  p: P;
  /** Miles from the shop, or null when either side has no verified location. */
  miles: number | null;
}

export interface RankOptions<P extends Project = Project> {
  /** The shop's verified location; null when it hasn't added one (then nothing is filtered). */
  shop: { lat: number; lng: number } | null;
  /** Keep jobs within this many miles; null means any distance. */
  limitMiles: number | null;
  /** Coordinates for a job that has none of its own (the demo maps town names). */
  fallbackCoords?: (p: P) => { lat: number; lng: number } | undefined;
}

/**
 * Open jobs, nearest first. Jobs without a location can't be measured, so they are kept
 * (after the ones that can be placed) rather than hidden.
 */
export function rankOpenJobs<P extends Project>(projects: P[], opts: RankOptions<P>): RankedJob<P>[] {
  const placed = projects
    .filter((p) => isOpenForBids(p.status))
    .map((p) => {
      const at = hasCoords(p) ? { lat: p.lat, lng: p.lng } : opts.fallbackCoords?.(p);
      return { p, miles: opts.shop && at ? distanceMiles(opts.shop, at) : null };
    });
  return placed
    .filter(({ miles }) => opts.limitMiles == null || miles == null || miles <= opts.limitMiles)
    .sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity));
}
