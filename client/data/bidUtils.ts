import { PROJECTS, Bid, BidMessage, Project } from "./projectData";

// ── Message helpers ──────────────────────────────────────────────────────────

function getLocalOwnerMessages(bidId: string): BidMessage[] {
  try {
    return JSON.parse(localStorage.getItem(`local_msgs_${bidId}`) ?? "[]");
  } catch {
    return [];
  }
}

function getLocalVendorMessages(bidId: string): BidMessage[] {
  try {
    return JSON.parse(localStorage.getItem(`vendor_msgs_${bidId}`) ?? "[]");
  } catch {
    return [];
  }
}

/** Returns the full merged thread: static bid.thread + owner replies + vendor replies */
export function getAllMessages(bid: Bid): BidMessage[] {
  return [
    ...bid.thread,
    ...getLocalOwnerMessages(bid.id),
    ...getLocalVendorMessages(bid.id),
  ];
}

/** Vendor sends a message on a bid thread */
export function sendVendorMessage(bidId: string, text: string): void {
  const now = new Date();
  const time =
    now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const msg: BidMessage = { from: "vendor", text: text.trim(), time };
  const existing = getLocalVendorMessages(bidId);
  localStorage.setItem(`vendor_msgs_${bidId}`, JSON.stringify([...existing, msg]));
}

// ── Bid submission helpers ───────────────────────────────────────────────────

interface SubmittedBidEntry {
  projectId: string;
  bid: Bid;
}

function getSubmittedBidEntries(): SubmittedBidEntry[] {
  try {
    return JSON.parse(localStorage.getItem("submitted_bids") ?? "[]");
  } catch {
    return [];
  }
}

/** All bids this vendor has submitted (from localStorage) */
export function getSubmittedBids(vendorId: string): Array<{ project: Project; bid: Bid }> {
  const entries = getSubmittedBidEntries();
  const results: Array<{ project: Project; bid: Bid }> = [];
  for (const entry of entries) {
    if (entry.bid.vendorName !== vendorId) continue;
    const project =
      PROJECTS.find((p) => p.id === entry.projectId) ??
      getAugmentedProjects().find((p) => p.id === entry.projectId);
    if (project) results.push({ project, bid: entry.bid });
  }
  return results;
}

/** True if the given vendor already has a bid on this project */
export function vendorHasBid(projectId: string, vendorId: string): boolean {
  // Check static bids
  const project = PROJECTS.find((p) => p.id === projectId);
  if (project?.bids.some((b) => b.vendorName === vendorId)) return true;
  // Check localStorage bids
  return getSubmittedBidEntries().some(
    (e) => e.projectId === projectId && e.bid.vendorName === vendorId
  );
}

/** Submit a new bid from the vendor side */
export function submitBid(projectId: string, bid: Bid): void {
  const existing = getSubmittedBidEntries();
  localStorage.setItem(
    "submitted_bids",
    JSON.stringify([...existing, { projectId, bid }])
  );
}

/** PROJECTS merged with any locally-submitted bids */
export function getAugmentedProjects(): Project[] {
  const entries = getSubmittedBidEntries();
  return PROJECTS.map((project) => {
    const extra = entries
      .filter((e) => e.projectId === project.id)
      .map((e) => e.bid);
    if (extra.length === 0) return project;
    return { ...project, bids: [...project.bids, ...extra] };
  });
}

/** All projects where a given vendor has a bid (static or submitted) */
export function getVendorBidProjects(vendorId: string): Array<{ project: Project; bid: Bid }> {
  const results: Array<{ project: Project; bid: Bid }> = [];

  // Static bids
  for (const project of PROJECTS) {
    const bid = project.bids.find((b) => b.vendorName === vendorId);
    if (bid) results.push({ project, bid });
  }

  // localStorage-submitted bids
  for (const { project, bid } of getSubmittedBids(vendorId)) {
    // avoid duplicates if static already included this project
    if (!results.find((r) => r.project.id === project.id && r.bid.id === bid.id)) {
      results.push({ project, bid });
    }
  }

  return results;
}

// ── Revenue helpers ──────────────────────────────────────────────────────────

export const BOSUN_FEE_RATE = 0.10;

export interface VendorTransaction {
  projectId: string;
  projectTitle: string;
  projectDate: string;
  bidId: string;
  gross: number;
  fee: number;
  net: number;
  status: "paid" | "in-progress" | "pending";
  boatName?: string;
  boatLabel?: string;  // e.g. "2022 Sea Ray SLX 280 · Twin Mercury V8 300hp Outboard"
}

export interface VendorRevenueSummary {
  paidGross: number;
  paidFees: number;
  paidNet: number;
  pendingGross: number;
  pendingNet: number;
  transactions: VendorTransaction[];
}

export function getVendorRevenue(vendorId: string): VendorRevenueSummary {
  const bidProjects = getVendorBidProjects(vendorId);
  const transactions: VendorTransaction[] = [];
  let paidGross = 0;
  let pendingGross = 0;

  for (const { project, bid } of bidProjects) {
    const gross = bid.price;
    const fee = gross * BOSUN_FEE_RATE;
    const net = gross - fee;

    const boatName = project.boat?.name;
    const boatLabel = project.boat
      ? `${project.boat.year} ${project.boat.make} ${project.boat.model} · ${project.boat.propulsion}`
      : undefined;

    // Completed project with this bid chosen → Paid
    if (project.status === "completed" && project.chosenBidId === bid.id) {
      paidGross += gross;
      transactions.push({
        projectId: project.id,
        projectTitle: project.title,
        projectDate: project.date,
        bidId: bid.id,
        gross, fee, net,
        status: "paid",
        boatName,
        boatLabel,
      });
      continue;
    }

    // Check for a localStorage booking referencing this bid
    let booking: { bidId: string } | null = null;
    try {
      const raw = localStorage.getItem(`booking_${project.id}`);
      if (raw) booking = JSON.parse(raw);
    } catch {}

    if (booking && booking.bidId === bid.id) {
      pendingGross += gross;
      let localStatus: string = project.status;
      try {
        localStatus = localStorage.getItem(`project_status_${project.id}`) ?? project.status;
      } catch {}
      transactions.push({
        projectId: project.id,
        projectTitle: project.title,
        projectDate: project.date,
        bidId: bid.id,
        gross, fee, net,
        status: localStatus === "in-progress" ? "in-progress" : "pending",
        boatName,
        boatLabel,
      });
    }
  }

  // Sort: paid first, then in-progress, then pending
  const ORDER = { paid: 0, "in-progress": 1, pending: 2 };
  transactions.sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return {
    paidGross,
    paidFees: paidGross * BOSUN_FEE_RATE,
    paidNet: paidGross * (1 - BOSUN_FEE_RATE),
    pendingGross,
    pendingNet: pendingGross * (1 - BOSUN_FEE_RATE),
    transactions,
  };
}

/** Count unread messages for a vendor (owner messages they haven't seen) */
export function getVendorUnreadCount(vendorId: string): number {
  let total = 0;
  for (const { bid } of getVendorBidProjects(vendorId)) {
    const key = `vendor_msg_read_${bid.id}`;
    const lastRead = parseInt(localStorage.getItem(key) ?? "0");
    const allMsgs = getAllMessages(bid);
    const unread = allMsgs.filter((m, i) => m.from === "user" && i >= lastRead).length;
    total += unread;
  }
  return total;
}
