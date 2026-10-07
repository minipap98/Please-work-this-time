// Supabase rows → the Project / Bid shapes the apps render. Pure: no client, no env.

import type { Tables } from "../database.types";
import type { Bid, BidMessage, Project, ProjectBoat } from "./types";

export const PROJECT_DETAIL_SELECT = `
  *,
  owner:profiles!owner_id(id, name, email, phone, location),
  boat:boats(*),
  photos:project_photos(*),
  bids:bids!bids_project_id_fkey(
    *,
    line_items:bid_line_items(*),
    vendor:vendor_profiles(*),
    messages(*)
  )
`;

export const PROJECT_LIST_SELECT = `
  *,
  owner:profiles!owner_id(id, name, email, phone, location),
  boat:boats(*),
  photos:project_photos(*),
  bids:bids!bids_project_id_fkey(
    *,
    line_items:bid_line_items(*),
    vendor:vendor_profiles(*),
    messages(*)
  )
`;

export const OPEN_RFP_SELECT = `
  *,
  boat:boats(*),
  photos:project_photos(*),
  bids:bids!bids_project_id_fkey(
    *,
    line_items:bid_line_items(*),
    vendor:vendor_profiles(*)
  )
`;

type VendorRow = Pick<
  Tables<"vendor_profiles">,
  "id" | "user_id" | "business_name" | "initials" | "completed_jobs" | "phone"
>;

type OwnerRow = Pick<Tables<"profiles">, "id" | "name" | "email" | "phone" | "location">;

type LineItemRow = Pick<
  Tables<"bid_line_items">,
  "description" | "quantity" | "unit_price"
>;

type MessageRow = Pick<
  Tables<"messages">,
  "sender_id" | "text" | "created_at" | "is_quote" | "quote_title" | "quote_price" | "quote_description"
> & Partial<Pick<Tables<"messages">, "recipient_id" | "status">> & { sender?: { role?: string } | null };

export type BidRow = Tables<"bids"> & {
  vendor?: VendorRow | null;
  line_items?: LineItemRow[] | null;
  messages?: MessageRow[] | null;
};

type BoatRow = Pick<Tables<"boats">, "name" | "make" | "model" | "year" | "propulsion" | "engine_make" | "engine_model" | "engine_count" | "hull_id" | "home_port" | "length_ft">;

type PhotoRow = Pick<Tables<"project_photos">, "url" | "sort_order">;

export type ProjectRow = Tables<"projects"> & {
  boat?: BoatRow | null;
  photos?: PhotoRow[] | null;
  bids?: BidRow[] | null;
  metadata?: Record<string, unknown> | null;
  owner?: OwnerRow | null;
};

export function formatProjectDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapBoat(boat: BoatRow | null | undefined): ProjectBoat | undefined {
  if (!boat) return undefined;
  return {
    name: boat.name,
    make: boat.make,
    model: boat.model,
    year: boat.year,
    propulsion: boat.propulsion ?? "",
    engineMake: boat.engine_make,
    engineModel: boat.engine_model,
    engineCount: boat.engine_count,
    hullId: boat.hull_id,
    homePort: boat.home_port,
    lengthFt: boat.length_ft,
  };
}

function mapMessage(msg: MessageRow, vendorUserId?: string): BidMessage {
  const fromVendor = vendorUserId
    ? msg.sender_id === vendorUserId
    : msg.sender?.role === "vendor";
  const base: BidMessage = {
    from: fromVendor ? "vendor" : "user",
    text: msg.text,
    time: formatProjectDate(msg.created_at),
    ...(msg.recipient_id ? { recipientId: msg.recipient_id, read: msg.status === "read" } : {}),
  };
  if (msg.is_quote) {
    return {
      ...base,
      type: "quote",
      quoteTitle: msg.quote_title ?? undefined,
      quotePrice: msg.quote_price ?? undefined,
      quoteDescription: msg.quote_description ?? undefined,
    };
  }
  return base;
}

export function mapBid(row: BidRow): Bid {
  const vendor = row.vendor;
  return {
    id: row.id,
    vendorProfileId: row.vendor_id,
    vendorUserId: vendor?.user_id,
    vendorPhone: vendor?.phone ?? undefined,
    vendorName: vendor?.business_name ?? "Vendor",
    vendorInitials: vendor?.initials || (vendor?.business_name ?? "V").slice(0, 2).toUpperCase(),
    rating: 0,
    reviewCount: vendor?.completed_jobs ?? 0,
    message: row.message ?? "",
    price: Number(row.price) || 0,
    lineItems: (row.line_items ?? []).map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: Number(li.unit_price) || 0,
    })),
    submittedDate: formatProjectDate(row.submitted_at),
    expiryDate: row.expiry_date ? formatProjectDate(row.expiry_date) : "TBD",
    thread: (row.messages ?? []).map((m) => mapMessage(m, vendor?.user_id)),
    rejected: row.rejected === true,
    withdrawnAt: row.withdrawn_at ?? null,
    // undefined until the migration adds the column; null after it, until the owner looks.
    seenAt: "seen_at" in row ? row.seen_at ?? null : undefined,
  };
}

export function mapProject(row: ProjectRow): Project {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const photos = [...(row.photos ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => p.url);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    date: formatProjectDate(row.date ?? row.created_at),
    location: row.location ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    category: row.category ?? undefined,
    owner: row.owner?.name,
    ownerId: row.owner_id,
    ownerContact: row.owner
      ? {
          name: row.owner.name,
          email: row.owner.email ?? undefined,
          phone: row.owner.phone ?? undefined,
          location: row.owner.location ?? undefined,
        }
      : undefined,
    boat: mapBoat(row.boat),
    boatId: row.boat_id ?? undefined,
    bids: (row.bids ?? []).map(mapBid),
    chosenBidId: row.chosen_bid_id ?? undefined,
    booking: meta.booking && typeof meta.booking === "object" ? (meta.booking as Record<string, unknown>) : null,
    photos: photos.length ? photos : undefined,
    isWarrantyClaim: Boolean(meta.isWarrantyClaim),
    workLocation: meta.workLocation as Project["workLocation"],
    workLocationNote: typeof meta.workLocationNote === "string" ? meta.workLocationNote : undefined,
    haulOutRequired: Boolean(meta.haulOutRequired),
    haulOutArrangedBy: meta.haulOutArrangedBy as Project["haulOutArrangedBy"],
    marinaCOIRequired: Boolean(meta.marinaCOIRequired),
    linkedEquipment: meta.linkedEquipment as Project["linkedEquipment"],
  };
}
