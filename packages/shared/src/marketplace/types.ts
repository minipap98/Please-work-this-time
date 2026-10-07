// The marketplace as the apps see it: a job (Project), the bids on it and each bid's thread.
// Rows from Supabase are mapped onto these shapes in ./map.ts.

export type ProjectStatus = "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";

export interface BidMessage {
  from: "vendor" | "user";
  text: string;
  time: string;
  /** Live messages: who it was sent to and whether they've read it. */
  recipientId?: string;
  read?: boolean;
  // Quote proposal fields (only present when type === "quote")
  type?: "quote";
  quoteId?: string;
  quoteTitle?: string;
  quotePrice?: number;
  quoteDescription?: string;
}

export interface Bid {
  id: string;
  vendorProfileId?: string;
  vendorUserId?: string;
  vendorPhone?: string;
  vendorName: string;
  vendorInitials: string;
  rating: number;
  reviewCount: number;
  message: string;
  price: number;
  lineItems?: { description: string; quantity: number; unitPrice: number }[];
  submittedDate: string;
  expiryDate: string;
  thread: BidMessage[];
  isAutoBid?: boolean;
  /** Owner declined it. */
  rejected?: boolean;
  /** When the shop withdrew it (live bids). */
  withdrawnAt?: string | null;
  /** When the owner first looked at it; null = not yet, undefined = column not available. */
  seenAt?: string | null;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ProjectBoat {
  name: string;
  make: string;
  model: string;
  year: string;
  propulsion: string;
  /** Extra details a shop can copy onto its customer file (live jobs only). */
  engineMake?: string | null;
  engineModel?: string | null;
  engineCount?: number | null;
  hullId?: string | null;
  homePort?: string | null;
  lengthFt?: number | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  date: string;
  location?: string;
  /** Approximate job location (rounded), when the owner's home port was verified. */
  lat?: number;
  lng?: number;
  category?: string;
  owner?: string;
  ownerId?: string;
  ownerContact?: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  boat?: ProjectBoat;
  /** The owner's boat this job is for (live jobs). */
  boatId?: string;
  bids: Bid[];
  chosenBidId?: string;
  /** Service window the owner picked when accepting (week, time, notes, bidId, vendorName). */
  booking?: Record<string, unknown> | null;
  photos?: string[];
  linkedEquipmentId?: string;
  isWarrantyClaim?: boolean;
  linkedEquipment?: {
    manufacturer: string;
    model: string;
    category: string;
    serialNumber: string;
    warrantyExpiry: string;
    warrantyStatus: string;
    dealer: string;
  };
  invoice?: {
    invoiceNumber: string;
    issuedDate: string;
    paidDate: string;
    items: InvoiceItem[];
  };
  workLocation?: "at_marina" | "vendor_facility" | "mobile";
  workLocationNote?: string;
  haulOutRequired?: boolean;
  haulOutArrangedBy?: "owner" | "vendor";
  marinaCOIRequired?: boolean;
}
