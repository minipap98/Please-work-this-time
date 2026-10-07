/* Pure logic for the Bosun admin portal: people, demand and prospects. */

export interface AdminPerson {
  id: string;
  email: string;
  name: string;
  role: "owner" | "vendor";
  isAdmin: boolean;
  onboardingComplete: boolean;
  emailConfirmed: boolean;
  suspended: boolean;
  createdAt: string;
  lastSignIn: string | null;
  location: string;
  /** Owners */
  boats: number;
  jobsPosted: number;
  /** Shops */
  shop?: {
    id: string;
    businessName: string;
    verifiedAt: string | null;
    insured: boolean;
    licensed: boolean;
    insuranceExpiry: string | null;
    phone: string;
    bids: number;
    won: number;
    workOrders: number;
    lastBidAt: string | null;
  };
}

export type AdminAction = "make-admin" | "remove-admin" | "suspend" | "reinstate" | "verify" | "unverify" | "reset-password" | "delete";

export interface DemandProject {
  id: string;
  title: string;
  category: string | null;
  status: string;
  createdAt: string;
  lat: number | null;
  lng: number | null;
  location: string | null;
  bids: number;
  bidders: number;
}

export interface DemandCell {
  area: string;
  category: string;
  lat: number | null;
  lng: number | null;
  jobs: number;
  /** Jobs that got no bid, or only one shop. */
  thin: number;
  shopsBidding: number;
  recentJobs: number; // last 30 days
  score: number;
}

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Fort Lauderdale, FL", lat: 26.1224, lng: -80.1373 },
  { name: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { name: "Key Biscayne, FL", lat: 25.6926, lng: -80.1628 },
  { name: "Pompano Beach, FL", lat: 26.2379, lng: -80.1248 },
  { name: "Boca Raton, FL", lat: 26.3683, lng: -80.1289 },
  { name: "West Palm Beach, FL", lat: 26.7153, lng: -80.0534 },
  { name: "Jupiter, FL", lat: 26.9342, lng: -80.0942 },
  { name: "Stuart, FL", lat: 27.1975, lng: -80.2528 },
  { name: "Naples, FL", lat: 26.142, lng: -81.7948 },
  { name: "Fort Myers, FL", lat: 26.6406, lng: -81.8723 },
  { name: "Sarasota, FL", lat: 27.3364, lng: -82.5307 },
  { name: "Tampa, FL", lat: 27.9506, lng: -82.4572 },
  { name: "Clearwater, FL", lat: 27.9659, lng: -82.8001 },
  { name: "Key Largo, FL", lat: 25.0865, lng: -80.4473 },
  { name: "Marathon, FL", lat: 24.7137, lng: -81.0904 },
  { name: "Key West, FL", lat: 24.5551, lng: -81.78 },
  { name: "Jacksonville, FL", lat: 30.3322, lng: -81.6557 },
  { name: "Daytona Beach, FL", lat: 29.2108, lng: -81.0228 },
  { name: "Charleston, SC", lat: 32.7765, lng: -79.9311 },
  { name: "Savannah, GA", lat: 32.0809, lng: -81.0912 },
  { name: "Annapolis, MD", lat: 38.9784, lng: -76.4922 },
  { name: "Newport, RI", lat: 41.4901, lng: -71.3128 },
  { name: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
  { name: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
];

function miles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** The nearest known town within 20 miles, else the job's own location text, else a rounded coordinate. */
export function areaName(lat: number | null, lng: number | null, locationText: string | null): string {
  if (lat != null && lng != null) {
    let best: { name: string; d: number } | null = null;
    for (const c of CITIES) {
      const d = miles(lat, lng, c.lat, c.lng);
      if (!best || d < best.d) best = { name: c.name, d };
    }
    if (best && best.d <= 20) return best.name;
  }
  if (locationText?.trim()) return locationText.trim();
  if (lat != null && lng != null) return `${lat.toFixed(1)}, ${lng.toFixed(1)}`;
  return "Unknown area";
}

/**
 * Groups jobs by area and category and scores where new shops would win work fastest:
 * lots of jobs, few shops bidding, and recent activity.
 */
export function demandCells(projects: DemandProject[], now = new Date()): DemandCell[] {
  const cells = new Map<string, DemandCell & { lats: number[]; lngs: number[]; bidderSets: Set<number> }>();
  const monthAgo = now.getTime() - 30 * 86400_000;
  for (const p of projects) {
    const area = areaName(p.lat, p.lng, p.location);
    const category = p.category?.trim() || "General";
    const key = `${area}|${category}`;
    const c = cells.get(key) ?? { area, category, lat: null, lng: null, jobs: 0, thin: 0, shopsBidding: 0, recentJobs: 0, score: 0, lats: [], lngs: [], bidderSets: new Set<number>() };
    c.jobs += 1;
    if (p.bidders <= 1) c.thin += 1;
    c.shopsBidding = Math.max(c.shopsBidding, p.bidders);
    if (Date.parse(p.createdAt) >= monthAgo) c.recentJobs += 1;
    if (p.lat != null && p.lng != null) {
      c.lats.push(p.lat);
      c.lngs.push(p.lng);
    }
    cells.set(key, c);
  }
  return [...cells.values()]
    .map(({ lats, lngs, bidderSets: _b, ...c }) => ({
      ...c,
      lat: lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : null,
      lng: lngs.length ? lngs.reduce((a, b) => a + b, 0) / lngs.length : null,
      score: Math.round(c.thin * 3 + c.recentJobs * 2 + c.jobs - c.shopsBidding * 2),
    }))
    .sort((a, b) => b.score - a.score || b.jobs - a.jobs);
}

export type ProspectStatus = "new" | "contacted" | "interested" | "onboarded" | "declined" | "not-a-fit";
export const PROSPECT_STATUSES: { value: ProspectStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "onboarded", label: "Onboarded" },
  { value: "declined", label: "Declined" },
  { value: "not-a-fit", label: "Not a fit" },
];

export interface Prospect {
  id: string;
  placeId: string | null;
  name: string;
  address: string;
  phone: string;
  website: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number;
  trades: string[];
  area: string;
  status: ProspectStatus;
  notes: string;
  nextFollowUp: string | null;
  assignedTo: string;
  convertedVendorId: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  /** Computed: demand near this shop and a 0–100 priority. */
  nearbyThinJobs?: number;
  score?: number;
}

/** 0–100: how worth a call this shop is, from demand near it and how established it looks. */
export function prospectScore(p: Pick<Prospect, "rating" | "reviewCount" | "phone" | "website" | "status" | "lat" | "lng">, cells: DemandCell[]): { score: number; nearbyThinJobs: number } {
  let nearbyThin = 0;
  let nearbyJobs = 0;
  if (p.lat != null && p.lng != null) {
    for (const c of cells) {
      if (c.lat == null || c.lng == null) continue;
      if (miles(p.lat, p.lng, c.lat, c.lng) <= 25) {
        nearbyThin += c.thin;
        nearbyJobs += c.jobs;
      }
    }
  }
  let score = Math.min(50, nearbyThin * 6 + nearbyJobs * 2);
  if (p.rating != null) score += Math.min(20, Math.max(0, (p.rating - 3.5) * 13));
  score += Math.min(15, Math.sqrt(p.reviewCount) * 2);
  if (p.phone) score += 8;
  if (p.website) score += 7;
  if (p.status === "declined" || p.status === "not-a-fit" || p.status === "onboarded") score = 0;
  return { score: Math.round(Math.min(100, score)), nearbyThinJobs: nearbyThin };
}

/** Search phrases that find marine service businesses in Google Places. */
export const PROSPECT_TRADES: { key: string; query: string }[] = [
  { key: "Engine service", query: "boat engine repair" },
  { key: "Marine mechanic", query: "marine mechanic" },
  { key: "Outboard service", query: "outboard motor repair" },
  { key: "Boatyard", query: "boatyard" },
  { key: "Detailing", query: "boat detailing" },
  { key: "Bottom paint", query: "boat bottom paint" },
  { key: "Electronics", query: "marine electronics installation" },
  { key: "Canvas", query: "marine canvas upholstery" },
  { key: "Fiberglass", query: "fiberglass boat repair" },
  { key: "Mobile mechanic", query: "mobile marine mechanic" },
];
