import {
  getVendorRevenue,
  getVendorBidProjects,
  isBidAccepted,
  VendorRevenueSummary,
  VendorTransaction,
} from "./bidUtils";
import { VENDOR_PROFILES } from "./vendorData";
import { PROJECTS } from "./projectData";

// ── Fee Tier System ─────────────────────────────────────────────────────────

export interface FeeTier {
  name: "Bronze" | "Silver" | "Gold";
  minEarnings: number;
  maxEarnings: number | null;
  feeRate: number;
  color: string;      // Tailwind text color
  bgColor: string;    // Tailwind bg color
  badgeColor: string; // Tailwind badge styling
}

export const FEE_TIERS: FeeTier[] = [
  {
    name: "Bronze",
    minEarnings: 0,
    maxEarnings: 5000,
    feeRate: 0.10,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    name: "Silver",
    minEarnings: 5000,
    maxEarnings: 20000,
    feeRate: 0.07,
    color: "text-slate-500",
    bgColor: "bg-slate-50",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
  },
  {
    name: "Gold",
    minEarnings: 20000,
    maxEarnings: null,
    feeRate: 0.05,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
];

/** Get the fee tier for a given lifetime gross earnings amount */
export function getVendorFeeTier(lifetimeGross: number): FeeTier {
  for (let i = FEE_TIERS.length - 1; i >= 0; i--) {
    if (lifetimeGross >= FEE_TIERS[i].minEarnings) return FEE_TIERS[i];
  }
  return FEE_TIERS[0];
}

export interface TierProgress {
  current: FeeTier;
  next: FeeTier | null;
  progress: number;   // 0–1 fraction toward next tier
  remaining: number;   // dollars remaining to next tier
  earnedInTier: number; // dollars earned within current tier
}

/** Get progress toward the next fee tier */
export function getTierProgress(lifetimeGross: number): TierProgress {
  const current = getVendorFeeTier(lifetimeGross);
  const currentIdx = FEE_TIERS.indexOf(current);
  const next = currentIdx < FEE_TIERS.length - 1 ? FEE_TIERS[currentIdx + 1] : null;

  if (!next) {
    return {
      current,
      next: null,
      progress: 1,
      remaining: 0,
      earnedInTier: lifetimeGross - current.minEarnings,
    };
  }

  const tierRange = next.minEarnings - current.minEarnings;
  const earnedInTier = lifetimeGross - current.minEarnings;
  const progress = Math.min(earnedInTier / tierRange, 1);
  const remaining = Math.max(next.minEarnings - lifetimeGross, 0);

  return { current, next, progress, remaining, earnedInTier };
}

/** Calculate how much the vendor saved vs. a flat 10% fee */
export function calculateFeeSavings(lifetimeGross: number, actualFees: number): number {
  const flatFees = lifetimeGross * 0.10;
  return flatFees - actualFees;
}

// ── Tiered Revenue (wraps getVendorRevenue) ─────────────────────────────────

export interface TieredTransaction extends VendorTransaction {
  effectiveFeeRate: number;
  effectiveFee: number;
  effectiveNet: number;
}

export interface VendorRevenueSummaryWithTiers extends Omit<VendorRevenueSummary, "transactions"> {
  currentTier: FeeTier;
  effectiveFeeRate: number;
  flatFeeSavings: number;
  tierProgress: TierProgress;
  tieredPaidFees: number;
  tieredPaidNet: number;
  tieredPendingNet: number;
  transactions: TieredTransaction[];
}

/** Recalculate vendor revenue using the sliding fee tier instead of flat 10% */
export function getVendorRevenueWithTiers(vendorId: string): VendorRevenueSummaryWithTiers {
  const base = getVendorRevenue(vendorId);
  const tier = getVendorFeeTier(base.paidGross);
  const rate = tier.feeRate;

  let tieredPaidFees = 0;
  let tieredPaidNet = 0;
  let tieredPendingNet = 0;

  const transactions: TieredTransaction[] = base.transactions.map((tx) => {
    const effectiveFeeRate = rate;
    const effectiveFee = tx.gross * rate;
    const effectiveNet = tx.gross - effectiveFee;

    if (tx.status === "paid") {
      tieredPaidFees += effectiveFee;
      tieredPaidNet += effectiveNet;
    } else {
      tieredPendingNet += effectiveNet;
    }

    return { ...tx, effectiveFeeRate, effectiveFee, effectiveNet };
  });

  const tierProgress = getTierProgress(base.paidGross);
  const flatFeeSavings = calculateFeeSavings(base.paidGross, tieredPaidFees);

  return {
    ...base,
    transactions,
    currentTier: tier,
    effectiveFeeRate: rate,
    flatFeeSavings,
    tierProgress,
    tieredPaidFees,
    tieredPaidNet,
    tieredPendingNet,
  };
}

// ── Vendor Scorecard ────────────────────────────────────────────────────────

export interface VendorScorecard {
  bidWinRate: number;
  completionRate: number;
  averageRating: number;
  repeatClientRate: number;
  totalBids: number;
  acceptedBids: number;
  completedJobs: number;
  uniqueClients: number;
  repeatClients: number;
  tier: FeeTier;
}

/** Compute performance metrics for a vendor */
export function getVendorScorecard(vendorId: string): VendorScorecard {
  const bidProjects = getVendorBidProjects(vendorId);
  const profile = VENDOR_PROFILES[vendorId];
  const revenue = getVendorRevenue(vendorId);
  const tier = getVendorFeeTier(revenue.paidGross);

  let totalBids = 0;
  let acceptedBids = 0;
  let completedJobs = 0;

  // Track unique boat names as proxy for unique clients (single owner in demo)
  const boatJobCount = new Map<string, number>();

  for (const { project, bid } of bidProjects) {
    totalBids++;

    if (isBidAccepted(project, bid)) {
      acceptedBids++;
    }

    if (project.status === "completed" && project.chosenBidId === bid.id) {
      completedJobs++;
      const boatKey = project.boat?.name ?? "Unknown";
      boatJobCount.set(boatKey, (boatJobCount.get(boatKey) ?? 0) + 1);
    }
  }

  const uniqueClients = boatJobCount.size;
  const repeatClients = Array.from(boatJobCount.values()).filter((c) => c >= 2).length;

  return {
    bidWinRate: totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0,
    completionRate: acceptedBids > 0 ? (completedJobs / acceptedBids) * 100 : 0,
    averageRating: profile?.rating ?? 0,
    repeatClientRate: uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0,
    totalBids,
    acceptedBids,
    completedJobs,
    uniqueClients,
    repeatClients,
    tier,
  };
}

// ── CRM: Client & Boat Service History ──────────────────────────────────────

export interface VendorBoatService {
  projectId: string;
  bidId?: string;
  title: string;
  date: string;
  price: number;
  status: "paid" | "in-progress" | "pending";
  category?: string;
  vendorName?: string;
  isOtherVendor?: boolean;
}

export interface VendorClientBoat {
  name: string;
  make: string;
  model: string;
  year: string;
  propulsion: string;
  label: string; // e.g. "2022 Sea Ray SLX 280"
  services: VendorBoatService[];
  totalRevenue: number;
}

export interface VendorClient {
  ownerName: string;
  boats: VendorClientBoat[];
  totalJobs: number;
  totalRevenue: number;
  firstJobDate: string;
  lastJobDate: string;
}

/** Get all clients (boat owners) the vendor has worked with, grouped by owner.
 *  Also includes work done on the same boat by OTHER vendors (marked with isOtherVendor). */
export function getVendorClients(vendorId: string): VendorClient[] {
  const revenue = getVendorRevenue(vendorId);
  const bidProjects = getVendorBidProjects(vendorId);

  // Step 1: Build owner → boat → services from this vendor's transactions
  const ownerMap = new Map<string, Map<string, VendorClientBoat>>();

  for (const tx of revenue.transactions) {
    const bp = bidProjects.find((bp) => bp.bid.id === tx.bidId);
    const boat = bp?.project.boat;
    const boatKey = boat?.name ?? "Unknown Vessel";
    const ownerKey = bp?.project.owner ?? "Dean";

    if (!ownerMap.has(ownerKey)) ownerMap.set(ownerKey, new Map());
    const boatMap = ownerMap.get(ownerKey)!;

    if (!boatMap.has(boatKey)) {
      boatMap.set(boatKey, {
        name: boat?.name ?? "Unknown Vessel",
        make: boat?.make ?? "",
        model: boat?.model ?? "",
        year: boat?.year ?? "",
        propulsion: boat?.propulsion ?? "",
        label: boat ? `${boat.year} ${boat.make} ${boat.model}` : "Unknown Vessel",
        services: [],
        totalRevenue: 0,
      });
    }

    const entry = boatMap.get(boatKey)!;
    entry.services.push({
      projectId: tx.projectId,
      bidId: tx.bidId,
      title: tx.projectTitle,
      date: tx.projectDate,
      price: tx.gross,
      status: tx.status,
      category: bp?.project.category,
      vendorName: vendorId,
      isOtherVendor: false,
    });
    entry.totalRevenue += tx.gross;
  }

  // Step 2: For each boat we know about, find completed projects from OTHER vendors
  const allProjects = PROJECTS;
  for (const [, boatMap] of ownerMap) {
    for (const [boatName, boatEntry] of boatMap) {
      const knownProjectIds = new Set(boatEntry.services.map((s) => s.projectId));

      // Find all projects for this same boat that were done by other vendors
      for (const project of allProjects) {
        if (project.boat?.name !== boatName) continue;
        if (knownProjectIds.has(project.id)) continue;
        if (project.status !== "completed") continue;
        if (!project.chosenBidId) continue;

        const winningBid = project.bids.find((b) => b.id === project.chosenBidId);
        if (!winningBid || winningBid.vendorName === vendorId) continue;

        boatEntry.services.push({
          projectId: project.id,
          title: project.title,
          date: project.date,
          price: winningBid.price,
          status: "paid",
          category: project.category,
          vendorName: winningBid.vendorName,
          isOtherVendor: true,
        });
      }
    }
  }

  // Step 3: Sort and build VendorClient[]
  const clients: VendorClient[] = [];
  for (const [ownerName, boatMap] of ownerMap) {
    const boats: VendorClientBoat[] = [];
    for (const boat of boatMap.values()) {
      // Sort services by date (newest first)
      boat.services.sort((a, b) => {
        try { return new Date(b.date).getTime() - new Date(a.date).getTime(); }
        catch { return 0; }
      });
      boats.push(boat);
    }
    boats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const allServices = boats.flatMap((b) => b.services);
    const dates = allServices.map((s) => {
      try { return new Date(s.date).getTime(); } catch { return 0; }
    }).filter((d) => d > 0);

    clients.push({
      ownerName,
      boats,
      totalJobs: allServices.filter((s) => !s.isOtherVendor).length,
      totalRevenue: boats.reduce((sum, b) => sum + b.totalRevenue, 0),
      firstJobDate: dates.length > 0
        ? new Date(Math.min(...dates)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "",
      lastJobDate: dates.length > 0
        ? new Date(Math.max(...dates)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "",
    });
  }

  // Sort clients by total revenue (highest first)
  clients.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return clients;
}

/** Get flat list of all boats the vendor has serviced with their service history */
export function getVendorBoatHistory(vendorId: string): VendorClientBoat[] {
  const clients = getVendorClients(vendorId);
  return clients.flatMap((c) => c.boats);
}

// ── Maintenance Reminders ───────────────────────────────────────────────────

/** Category → recommended service interval in months */
export const SERVICE_INTERVALS: Record<string, { months: number; followUp: string }> = {
  "Engine Service":   { months: 12, followUp: "Annual engine service due" },
  "Bottom Work":      { months: 12, followUp: "Bottom paint refresh recommended" },
  "Bottom Paint":     { months: 12, followUp: "Bottom paint refresh recommended" },
  "Detailing":        { months: 6,  followUp: "Detail & wax recommended" },
  "Mechanical":       { months: 12, followUp: "Annual mechanical inspection due" },
  "Electronics":      { months: 24, followUp: "Electronics check & firmware update" },
  "Electrical":       { months: 18, followUp: "Electrical system inspection" },
  "Deck Hardware":    { months: 18, followUp: "Deck hardware inspection & service" },
  "Canvas & Upholstery": { months: 12, followUp: "Canvas & upholstery inspection" },
  "HVAC":             { months: 12, followUp: "HVAC seasonal service due" },
  "Safety Equipment": { months: 12, followUp: "Safety equipment recertification due" },
  "Fuel System":      { months: 12, followUp: "Fuel system inspection due" },
  "Plumbing":         { months: 18, followUp: "Plumbing inspection recommended" },
};

export interface MaintenanceReminder {
  boatName: string;
  boatLabel: string;
  lastService: string;
  lastServiceDate: string;
  monthsSince: number;
  suggestedFollowUp: string;
  urgency: "overdue" | "upcoming" | "ok";
  category: string;
}

/** Generate maintenance reminders based on completed services and their categories */
export function getMaintenanceReminders(vendorId: string): MaintenanceReminder[] {
  const boats = getVendorBoatHistory(vendorId);
  const now = new Date();
  const reminders: MaintenanceReminder[] = [];

  for (const boat of boats) {
    // Group services by category, keeping only the most recent per category
    const latestByCategory = new Map<string, VendorBoatService>();

    for (const svc of boat.services) {
      if (svc.status !== "paid") continue; // only completed services
      const cat = svc.category ?? "General";
      const existing = latestByCategory.get(cat);
      if (!existing) {
        latestByCategory.set(cat, svc);
      } else {
        try {
          if (new Date(svc.date).getTime() > new Date(existing.date).getTime()) {
            latestByCategory.set(cat, svc);
          }
        } catch { /* keep existing */ }
      }
    }

    for (const [category, svc] of latestByCategory) {
      const interval = SERVICE_INTERVALS[category];
      if (!interval) continue; // no interval defined for this category

      let monthsSince = 0;
      try {
        const svcDate = new Date(svc.date);
        monthsSince = Math.floor(
          (now.getTime() - svcDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );
      } catch {
        continue;
      }

      let urgency: "overdue" | "upcoming" | "ok";
      if (monthsSince >= interval.months) {
        urgency = "overdue";
      } else if (monthsSince >= interval.months - 2) {
        urgency = "upcoming";
      } else {
        urgency = "ok";
      }

      reminders.push({
        boatName: boat.name,
        boatLabel: boat.label,
        lastService: svc.title,
        lastServiceDate: svc.date,
        monthsSince,
        suggestedFollowUp: interval.followUp,
        urgency,
        category,
      });
    }
  }

  // Sort: overdue first, then upcoming, then ok
  const ORDER = { overdue: 0, upcoming: 1, ok: 2 };
  reminders.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency]);

  return reminders;
}

// ── Quick Invoice Generator ─────────────────────────────────────────────────

export interface QuickInvoice {
  invoiceNumber: string;
  vendorName: string;
  vendorServiceArea: string;
  ownerName: string;
  boatName?: string;
  boatLabel?: string;
  projectTitle: string;
  projectDate: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  feeRate: number;
  bosunFee: number;
  netPayout: number;
}

/** Generate a quick invoice view for a completed job */
export function generateQuickInvoice(
  vendorId: string,
  projectId: string,
  bidId: string
): QuickInvoice | null {
  const bidProjects = getVendorBidProjects(vendorId);
  const match = bidProjects.find(
    (bp) => bp.project.id === projectId && bp.bid.id === bidId
  );
  if (!match) return null;

  const { project, bid } = match;
  const profile = VENDOR_PROFILES[vendorId];
  const revenue = getVendorRevenue(vendorId);
  const tier = getVendorFeeTier(revenue.paidGross);

  const items = bid.lineItems ?? [
    { description: project.title, quantity: 1, unitPrice: bid.price },
  ];

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const bosunFee = subtotal * tier.feeRate;

  return {
    invoiceNumber: `INV-${projectId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}-${bidId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`,
    vendorName: profile?.name ?? vendorId,
    vendorServiceArea: profile?.serviceArea ?? "",
    ownerName: project.owner ?? "Dean",
    boatName: project.boat?.name,
    boatLabel: project.boat
      ? `${project.boat.year} ${project.boat.make} ${project.boat.model}`
      : undefined,
    projectTitle: project.title,
    projectDate: project.date,
    items,
    subtotal,
    feeRate: tier.feeRate,
    bosunFee,
    netPayout: subtotal - bosunFee,
  };
}

// ── Escrow Status ───────────────────────────────────────────────────────────

export interface EscrowTimeline {
  step: string;
  status: "complete" | "active" | "upcoming";
}

export interface EscrowStatus {
  status: "deposit-held" | "full-escrow" | "released" | "pending";
  statusLabel: string;
  bidAmount: number;
  depositAmount: number;
  timeline: EscrowTimeline[];
}

/** Derive mock escrow status from existing project/booking state */
export function getEscrowStatus(projectId: string, bidId: string, bidAmount: number): EscrowStatus {
  // Check for deposit
  let deposit: { amount: number; full?: boolean } | null = null;
  try {
    const raw = localStorage.getItem(`deposit_${projectId}`);
    if (raw) deposit = JSON.parse(raw);
  } catch {}

  // Check project status
  let projectStatus = "";
  try {
    projectStatus = localStorage.getItem(`project_status_${projectId}`) ?? "";
  } catch {}

  // Check for booking
  let hasBooking = false;
  try {
    const raw = localStorage.getItem(`booking_${projectId}`);
    if (raw) {
      const booking = JSON.parse(raw);
      hasBooking = booking.bidId === bidId;
    }
  } catch {}

  const depositAmount = Math.round(bidAmount * 0.25);

  // Completed → funds released
  if (projectStatus === "completed") {
    return {
      status: "released",
      statusLabel: "Funds Released",
      bidAmount,
      depositAmount,
      timeline: [
        { step: "Deposit secured", status: "complete" },
        { step: "Work completed", status: "complete" },
        { step: "Funds released to you", status: "complete" },
      ],
    };
  }

  // Has deposit and full payment
  if (deposit?.full) {
    return {
      status: "full-escrow",
      statusLabel: "Full Payment in Escrow",
      bidAmount,
      depositAmount: bidAmount,
      timeline: [
        { step: "Full payment secured", status: "complete" },
        { step: "Work in progress", status: "active" },
        { step: "Released on completion", status: "upcoming" },
      ],
    };
  }

  // In-progress with booking → deposit held
  if (hasBooking || projectStatus === "in-progress") {
    return {
      status: "deposit-held",
      statusLabel: "Deposit Held in Escrow",
      bidAmount,
      depositAmount,
      timeline: [
        { step: `$${depositAmount.toLocaleString()} deposit secured`, status: "complete" },
        { step: "Work in progress", status: "active" },
        { step: "Balance released on completion", status: "upcoming" },
      ],
    };
  }

  // Default: pending
  return {
    status: "pending",
    statusLabel: "Awaiting Deposit",
    bidAmount,
    depositAmount,
    timeline: [
      { step: "Awaiting owner deposit", status: "active" },
      { step: "Work begins", status: "upcoming" },
      { step: "Released on completion", status: "upcoming" },
    ],
  };
}

// ── Advanced Analytics ──────────────────────────────────────────────────────

export interface WinRateByCategory {
  category: string;
  totalBids: number;
  wonBids: number;
  winRate: number;
}

export interface BidComparison {
  category: string;
  avgVendorBid: number;
  avgWinningBid: number;
  delta: number; // positive = vendor bids higher, negative = vendor bids lower
}

export interface MonthlyDemand {
  month: string; // "Jan", "Feb", etc.
  monthIndex: number;
  rfpCount: number;
}

export interface RevenueByBoatClass {
  boatClass: string;
  revenue: number;
  jobCount: number;
}

export interface CertificationImpact {
  certification: string;
  rfpsReceived: number;
  bidWinRate: number;
}

export interface ResponseTimeImpact {
  bracket: string;
  winRate: number;
  avgResponseHours: number;
}

export interface VendorAnalytics {
  winRateByCategory: WinRateByCategory[];
  bidComparisons: BidComparison[];
  monthlyDemand: MonthlyDemand[];
  revenueByBoatClass: RevenueByBoatClass[];
  responseTimeImpact: ResponseTimeImpact[];
  avgResponseTimeHours: number;
  repeatClientRate: number;
  repeatClients: number;
  uniqueClients: number;
}

/** Compute advanced analytics for a vendor's business performance */
export function getVendorAnalytics(vendorId: string): VendorAnalytics {
  const bidProjects = getVendorBidProjects(vendorId);
  const profile = VENDOR_PROFILES[vendorId];
  const allProjects = PROJECTS;

  // ── Win rate by category ──────────────────────────────────────────────
  const catStats = new Map<string, { total: number; won: number }>();
  for (const { project, bid } of bidProjects) {
    const cat = project.category ?? "Other";
    if (!catStats.has(cat)) catStats.set(cat, { total: 0, won: 0 });
    const entry = catStats.get(cat)!;
    entry.total++;
    if (isBidAccepted(project, bid)) entry.won++;
  }
  const winRateByCategory: WinRateByCategory[] = Array.from(catStats.entries())
    .map(([category, { total, won }]) => ({
      category,
      totalBids: total,
      wonBids: won,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
    }))
    .sort((a, b) => b.totalBids - a.totalBids);

  // ── Bid comparisons (avg vendor bid vs avg winning bid per category) ──
  const bidCompMap = new Map<string, { vendorBids: number[]; winningBids: number[] }>();
  for (const { project, bid } of bidProjects) {
    const cat = project.category ?? "Other";
    if (!bidCompMap.has(cat)) bidCompMap.set(cat, { vendorBids: [], winningBids: [] });
    const entry = bidCompMap.get(cat)!;
    entry.vendorBids.push(bid.price);
    if (project.chosenBidId) {
      const winBid = project.bids.find((b) => b.id === project.chosenBidId);
      if (winBid) entry.winningBids.push(winBid.price);
    }
  }
  const bidComparisons: BidComparison[] = Array.from(bidCompMap.entries())
    .filter(([, v]) => v.winningBids.length > 0)
    .map(([category, { vendorBids, winningBids }]) => {
      const avgV = vendorBids.reduce((a, b) => a + b, 0) / vendorBids.length;
      const avgW = winningBids.reduce((a, b) => a + b, 0) / winningBids.length;
      return { category, avgVendorBid: Math.round(avgV), avgWinningBid: Math.round(avgW), delta: Math.round(avgV - avgW) };
    });

  // ── Monthly demand (RFP count per month across all projects) ──────────
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthCounts = new Array(12).fill(0);
  for (const project of allProjects) {
    try {
      const d = new Date(project.date);
      if (!isNaN(d.getTime())) monthCounts[d.getMonth()]++;
    } catch { /* skip */ }
  }
  const monthlyDemand: MonthlyDemand[] = monthNames.map((month, i) => ({
    month,
    monthIndex: i,
    rfpCount: monthCounts[i],
  }));

  // ── Revenue by boat class ─────────────────────────────────────────────
  const boatClassMap = new Map<string, { revenue: number; jobs: number }>();
  for (const { project, bid } of bidProjects) {
    if (!isBidAccepted(project, bid)) continue;
    const boat = project.boat;
    const cls = boat ? `${boat.make} ${boat.model}` : "Unknown";
    if (!boatClassMap.has(cls)) boatClassMap.set(cls, { revenue: 0, jobs: 0 });
    const entry = boatClassMap.get(cls)!;
    entry.revenue += bid.price;
    entry.jobs++;
  }
  const revenueByBoatClass: RevenueByBoatClass[] = Array.from(boatClassMap.entries())
    .map(([boatClass, { revenue, jobs }]) => ({ boatClass, revenue: Math.round(revenue), jobCount: jobs }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Response time impact (simulated brackets) ─────────────────────────
  const responseTimeImpact: ResponseTimeImpact[] = [
    { bracket: "< 2 hours", winRate: 68, avgResponseHours: 1.2 },
    { bracket: "2–6 hours", winRate: 45, avgResponseHours: 3.8 },
    { bracket: "6–24 hours", winRate: 28, avgResponseHours: 14 },
    { bracket: "> 24 hours", winRate: 12, avgResponseHours: 38 },
  ];

  // ── Repeat clients ────────────────────────────────────────────────────
  const boatJobCount = new Map<string, number>();
  for (const { project, bid } of bidProjects) {
    if (project.status === "completed" && project.chosenBidId === bid.id) {
      const boatKey = project.boat?.name ?? "Unknown";
      boatJobCount.set(boatKey, (boatJobCount.get(boatKey) ?? 0) + 1);
    }
  }
  const uniqueClients = boatJobCount.size;
  const repeatClients = Array.from(boatJobCount.values()).filter((c) => c >= 2).length;
  const repeatClientRate = uniqueClients > 0 ? Math.round((repeatClients / uniqueClients) * 100) : 0;

  // ── Average response time (simulated from profile) ────────────────────
  const responseStr = profile?.responseTime ?? "< 2 hours";
  let avgResponseTimeHours = 1.5;
  if (responseStr.includes("4")) avgResponseTimeHours = 4;
  else if (responseStr.includes("6")) avgResponseTimeHours = 5;
  else if (responseStr.includes("24") || responseStr.includes("day")) avgResponseTimeHours = 18;

  return {
    winRateByCategory,
    bidComparisons,
    monthlyDemand,
    revenueByBoatClass,
    responseTimeImpact,
    avgResponseTimeHours,
    repeatClientRate,
    repeatClients,
    uniqueClients,
  };
}
