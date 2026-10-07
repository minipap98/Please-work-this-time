import { PROJECTS, Bid, BidMessage, Project, ProjectBoat } from "./projectData";

// ── Local project helpers ────────────────────────────────────────────────────

/** All projects Dean created locally (saved in localStorage) */
export function getLocalProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem("local_projects") ?? "[]");
  } catch {
    return [];
  }
}

/** Save a new locally-created project to localStorage */
export function saveLocalProject(project: Project): void {
  const existing = getLocalProjects();
  localStorage.setItem("local_projects", JSON.stringify([...existing, project]));
}

/** Static PROJECTS + locally-created projects */
export function getAllProjects(): Project[] {
  return [...PROJECTS, ...getLocalProjects()];
}

// ── Cancellation helpers ─────────────────────────────────────────────────────

/** IDs of projects the owner has cancelled */
export function getCancelledProjectIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("cancelled_projects") ?? "[]");
  } catch {
    return [];
  }
}

/** Mark a project as cancelled (moves it to the Expired tab on the owner side) */
export function cancelProject(projectId: string): void {
  const existing = getCancelledProjectIds();
  if (!existing.includes(projectId)) {
    localStorage.setItem("cancelled_projects", JSON.stringify([...existing, projectId]));
  }
}

/** Reinstate a cancelled or expired project back to active (accepting bids) */
export function reinstateProject(projectId: string): void {
  // Remove from cancelled list if present
  const cancelled = getCancelledProjectIds();
  localStorage.setItem("cancelled_projects", JSON.stringify(cancelled.filter((id) => id !== projectId)));
  // Set an explicit status override back to bidding
  // (required for statically-expired projects whose p.status can't be mutated)
  localStorage.setItem(`project_status_${projectId}`, "bidding");
}

// ── Bid rejection helpers ────────────────────────────────────────────────────

/** IDs of bids the owner has rejected */
export function getRejectedBidIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("rejected_bids") ?? "[]");
  } catch {
    return [];
  }
}

/** Reject a vendor's bid */
export function rejectBid(bidId: string): void {
  const existing = getRejectedBidIds();
  if (!existing.includes(bidId)) {
    localStorage.setItem("rejected_bids", JSON.stringify([...existing, bidId]));
  }
}

/** Undo a rejection */
export function unrejectBid(bidId: string): void {
  const existing = getRejectedBidIds();
  localStorage.setItem("rejected_bids", JSON.stringify(existing.filter((id) => id !== bidId)));
}

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
    const project = getAllProjects().find((p) => p.id === entry.projectId);
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

/** All projects (static + local) merged with any vendor-submitted bids */
export function getAugmentedProjects(): Project[] {
  const entries = getSubmittedBidEntries();
  return getAllProjects().map((project) => {
    const extra = entries
      .filter((e) => e.projectId === project.id)
      .map((e) => e.bid);
    if (extra.length === 0) return project;
    return { ...project, bids: [...project.bids, ...extra] };
  });
}

/** All projects where a given vendor has a bid (static, local, or submitted) */
export function getVendorBidProjects(vendorId: string): Array<{ project: Project; bid: Bid }> {
  const results: Array<{ project: Project; bid: Bid }> = [];

  // Static + local projects with embedded bids
  for (const project of getAllProjects()) {
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

// ── Accepted-bid detector ─────────────────────────────────────────────────────

/** True if the vendor's bid has been accepted/booked by the owner */
export function isBidAccepted(project: Project, bid: Bid): boolean {
  if (project.chosenBidId === bid.id) return true;
  try {
    const raw = localStorage.getItem(`booking_${project.id}`);
    if (raw) {
      const booking = JSON.parse(raw);
      if (booking.bidId === bid.id) return true;
    }
  } catch {}
  return false;
}

// ── Quote proposal helpers ────────────────────────────────────────────────────

function nowTimestamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

/** Vendor sends a quote proposal into a bid's thread */
export function sendVendorQuote(
  bidId: string,
  quoteId: string,
  title: string,
  price: number,
  description: string
): void {
  const msg: BidMessage = {
    from: "vendor",
    text: `Quote: ${title} — $${price.toLocaleString()}`,
    time: nowTimestamp(),
    type: "quote",
    quoteId,
    quoteTitle: title,
    quotePrice: price,
    quoteDescription: description,
  };
  const existing = JSON.parse(localStorage.getItem(`vendor_msgs_${bidId}`) ?? "[]") as BidMessage[];
  localStorage.setItem(`vendor_msgs_${bidId}`, JSON.stringify([...existing, msg]));
}

/** Get the status of a quote: "accepted" | "rejected" | null */
export function getQuoteStatus(quoteId: string): "accepted" | "rejected" | null {
  return (localStorage.getItem(`quote_status_${quoteId}`) as "accepted" | "rejected") ?? null;
}

/** Owner accepts a quote → marks it and creates a new project */
export function acceptQuote(
  quoteId: string,
  vendorName: string,
  vendorInitials: string,
  title: string,
  price: number,
  description: string,
  boat?: ProjectBoat
): void {
  localStorage.setItem(`quote_status_${quoteId}`, "accepted");

  const bidId = `qbid_${quoteId}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const vendorBid: Bid = {
    id: bidId,
    vendorName,
    vendorInitials,
    rating: 0,
    reviewCount: 0,
    message: description,
    price,
    submittedDate: dateStr,
    expiryDate: "",
    thread: [],
  };

  const newProject: Project = {
    id: `local_${quoteId}`,
    title,
    description,
    status: "in-progress",
    date: dateStr,
    boat,
    bids: [vendorBid],
    chosenBidId: bidId,
  };

  saveLocalProject(newProject);
  localStorage.setItem(`booking_${newProject.id}`, JSON.stringify({ bidId }));
  localStorage.setItem(`project_status_${newProject.id}`, "in-progress");
}

/** Owner rejects a quote */
export function rejectQuote(quoteId: string): void {
  localStorage.setItem(`quote_status_${quoteId}`, "rejected");
}

// ── Bid adjustment helpers ────────────────────────────────────────────────────

export interface BidAdjustment {
  price: number;
  message: string;
}

/** Get any price/message revision the vendor made to their bid */
export function getBidAdjustment(bidId: string): BidAdjustment | null {
  try {
    const raw = localStorage.getItem(`bid_adjustment_${bidId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Save a vendor's revised bid price and message */
export function saveBidAdjustment(bidId: string, price: number, message: string): void {
  localStorage.setItem(`bid_adjustment_${bidId}`, JSON.stringify({ price, message }));
}

// ── Effective project status ──────────────────────────────────────────────────

/**
 * Returns the runtime status of a project, factoring in:
 *  1. An explicit `project_status_${id}` override stored by the owner's UI
 *  2. A confirmed booking (`booking_${id}`) → treat as "in-progress"
 *  3. Falls back to the project's static status field
 */
export function getLocalProjectStatus(projectId: string, fallback: string): string {
  try {
    const explicit = localStorage.getItem(`project_status_${projectId}`);
    if (explicit) return explicit;
    if (localStorage.getItem(`booking_${projectId}`)) return "in-progress";
  } catch {}
  return fallback;
}

// ── Bid rescission helpers ────────────────────────────────────────────────────

/** IDs of bids the vendor has rescinded/withdrawn */
export function getRescindedBidIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("rescinded_bids") ?? "[]");
  } catch {
    return [];
  }
}

/** Vendor withdraws their bid */
export function rescindBid(bidId: string): void {
  const existing = getRescindedBidIds();
  if (!existing.includes(bidId)) {
    localStorage.setItem("rescinded_bids", JSON.stringify([...existing, bidId]));
  }
}
