import type { Bid, BidMessage, Project, ProjectBoat } from "@/data/projectData";
import { supabase, supabaseMissing } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export const PROJECT_DETAIL_SELECT = `
  *,
  owner:profiles!owner_id(id, name, email, phone, location),
  boat:boats(*),
  photos:project_photos(*),
  bids(
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
  bids(
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
  bids(
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
> & { sender?: { role?: string } | null };

type BidRow = Tables<"bids"> & {
  vendor?: VendorRow | null;
  line_items?: LineItemRow[] | null;
  messages?: MessageRow[] | null;
};

type BoatRow = Pick<Tables<"boats">, "name" | "make" | "model" | "year" | "propulsion">;

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
    bids: (row.bids ?? []).map(mapBid),
    chosenBidId: row.chosen_bid_id ?? undefined,
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

export async function requireClient() {
  if (supabaseMissing || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadProjectPhotos(
  userId: string,
  projectId: string,
  photos: string[]
): Promise<string[]> {
  const client = await requireClient();
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (!photo) continue;
    if (photo.startsWith("http")) {
      urls.push(photo);
      continue;
    }
    if (!photo.startsWith("data:image/")) continue;
    const blob = dataUrlToBlob(photo);
    const ext = blob.type.split("/")[1] || "jpg";
    const path = `${userId}/${projectId}/${i}.${ext}`;
    const { error } = await client.storage.from("project-photos").upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) throw error;
    const { data } = client.storage.from("project-photos").getPublicUrl(path);
    urls.push(data.publicUrl);
    await client.from("project_photos").insert({
      project_id: projectId,
      url: data.publicUrl,
      sort_order: i,
    });
  }
  return urls;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  category?: string;
  location?: string;
  boatId?: string;
  photos?: string[];
  metadata?: Record<string, unknown>;
}

export async function createMarketplaceProject(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const client = await requireClient();
  const { data, error } = await client
    .from("projects")
    .insert({
      owner_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location,
      boat_id: input.boatId,
      status: "bidding",
      metadata: input.metadata ?? {},
    } as never)
    .select(PROJECT_LIST_SELECT)
    .single();
  if (error) throw error;
  const project = mapProject(data as unknown as ProjectRow);
  if (input.photos?.length) {
    await uploadProjectPhotos(userId, project.id, input.photos);
  }
  try {
    const { data: session } = await client.auth.getSession();
    const token = session.session?.access_token;
    if (token) {
      await fetch("/api/jobs/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId: project.id }),
      });
    }
  } catch {
    // In-app notifications still fire from the database trigger.
  }
  return project;
}

export interface SubmitBidInput {
  projectId: string;
  vendorProfileId: string;
  price: number;
  message: string;
  expiryDate?: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
}

export async function submitMarketplaceBid(input: SubmitBidInput): Promise<void> {
  const client = await requireClient();
  if (input.price <= 0) throw new Error("Bid total must be greater than $0.");
  if (!input.message.trim()) throw new Error("Add a short message with your bid.");

  const { data: bid, error } = await client
    .from("bids")
    .insert({
      project_id: input.projectId,
      vendor_id: input.vendorProfileId,
      price: input.price,
      message: input.message.trim(),
      expiry_date: input.expiryDate || null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const items = input.lineItems.filter((li) => li.description.trim() && li.unitPrice > 0);
  if (items.length) {
    const { error: liError } = await client.from("bid_line_items").insert(
      items.map((li, i) => ({
        bid_id: bid.id,
        description: li.description.trim(),
        quantity: li.quantity || 1,
        unit_price: li.unitPrice,
        sort_order: i,
      }))
    );
    if (liError) throw liError;
  }
}

export async function updateProjectStatus(
  projectId: string,
  status: Project["status"]
): Promise<void> {
  const client = await requireClient();
  const { error } = await client.from("projects").update({ status }).eq("id", projectId);
  if (error) throw error;
}

export async function acceptMarketplaceBid(
  projectId: string,
  bidId: string,
  booking?: Record<string, unknown>
): Promise<void> {
  const client = await requireClient();
  const { error: bidError } = await client.from("bids").update({ accepted: true }).eq("id", bidId);
  if (bidError) throw bidError;
  const { data: existing } = await client
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();
  const metadata = {
    ...(((existing as { metadata?: Record<string, unknown> } | null)?.metadata) ?? {}),
    booking: booking ?? null,
  };
  const { error } = await client
    .from("projects")
    .update({ chosen_bid_id: bidId, status: "in-progress", metadata } as never)
    .eq("id", projectId);
  if (error) throw error;
}
