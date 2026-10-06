import type { Request, RequestHandler, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { PROSPECT_TRADES, areaName, type AdminAction, type AdminPerson, type DemandProject, type Prospect } from "../../shared/admin.js";
import { summarizeAiUsage, type AiKind, type AiLimit, type AiStatus, type AiUsageRow } from "../../shared/aiUsage.js";
import { consumeQuota, recordUsage, usageOf } from "../lib/ai-usage.js";

/* ── Auth: the caller must be signed in and have profiles.is_admin ─────────── */

interface AdminCtx {
  db: SupabaseClient;
  admin: User;
}

async function requireAdmin(req: Request, res: Response): Promise<AdminCtx | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!url || !anon || !token) {
    res.status(401).json({ error: "Sign in as an admin." });
    return null;
  }
  if (!service) {
    res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server.", code: "not_configured" });
    return null;
  }
  const { data, error } = await createClient(url, anon).auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Sign in as an admin." });
    return null;
  }
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_admin) {
    res.status(403).json({ error: "This account isn't an admin." });
    return null;
  }
  return { db, admin: data.user };
}

async function audit(ctx: AdminCtx, action: string, targetId: string | null, targetLabel: string, detail: Record<string, unknown> = {}) {
  await ctx.db.from("admin_audit").insert({ admin_id: ctx.admin.id, action, target_id: targetId, target_label: targetLabel, detail });
}

function fail(res: Response, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  res.status(500).json({ error: msg });
}

/* ── People ───────────────────────────────────────────────────────────────── */

async function listAllUsers(db: SupabaseClient): Promise<User[]> {
  const out: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 500) break;
  }
  return out;
}

export const handleAdminPeople: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const { db } = ctx;
    const [users, profiles, vendors, boats, projects, bids, workOrders] = await Promise.all([
      listAllUsers(db),
      db.from("profiles").select("id, email, name, role, is_admin, onboarding_complete, location, created_at"),
      db.from("vendor_profiles").select("id, user_id, business_name, verified_at, insured, licensed, insurance_expiry, phone"),
      db.from("boats").select("owner_id"),
      db.from("projects").select("owner_id"),
      db.from("bids").select("vendor_id, created_at, project_id").limit(10000),
      db.from("shop_work_orders").select("vendor_id"),
    ]);
    for (const r of [profiles, vendors, boats, projects, bids, workOrders]) if (r.error) throw r.error;
    const count = (rows: { [k: string]: unknown }[] | null, key: string) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        const k = String(r[key] ?? "");
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const boatsBy = count(boats.data, "owner_id");
    const jobsBy = count(projects.data, "owner_id");
    const woBy = count(workOrders.data, "vendor_id");
    const bidsBy = new Map<string, { n: number; won: number; last: string | null }>();
    for (const b of (bids.data ?? []) as unknown as { vendor_id: string; created_at: string; id?: string; projects: { chosen_bid_id: string | null } | null }[]) {
      const cur = bidsBy.get(b.vendor_id) ?? { n: 0, won: 0, last: null };
      cur.n += 1;
      if (!cur.last || b.created_at > cur.last) cur.last = b.created_at;
      bidsBy.set(b.vendor_id, cur);
    }
    // Won = chosen bid belongs to this vendor. Re-query compactly.
    const { data: won } = await db.from("projects").select("chosen_bid_id, bids!fk_chosen_bid(vendor_id)").not("chosen_bid_id", "is", null);
    for (const w of (won ?? []) as unknown as { bids: { vendor_id: string } | null }[]) {
      const v = w.bids?.vendor_id;
      if (!v) continue;
      const cur = bidsBy.get(v) ?? { n: 0, won: 0, last: null };
      cur.won += 1;
      bidsBy.set(v, cur);
    }
    const vendorByUser = new Map((vendors.data ?? []).map((v) => [v.user_id as string, v]));
    const profileById = new Map((profiles.data ?? []).map((p) => [p.id as string, p]));
    const people: AdminPerson[] = users.map((u) => {
      const p = profileById.get(u.id);
      const v = vendorByUser.get(u.id);
      const banned = (u as unknown as { banned_until?: string | null }).banned_until;
      const stats = v ? bidsBy.get(v.id as string) : undefined;
      return {
        id: u.id,
        email: u.email ?? p?.email ?? "",
        name: p?.name ?? (u.user_metadata?.name as string | undefined) ?? "",
        role: (p?.role as "owner" | "vendor") ?? "owner",
        isAdmin: !!p?.is_admin,
        onboardingComplete: !!p?.onboarding_complete,
        emailConfirmed: !!u.email_confirmed_at,
        suspended: !!banned && Date.parse(banned) > Date.now(),
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        location: (p?.location as string | null) ?? "",
        boats: boatsBy.get(u.id) ?? 0,
        jobsPosted: jobsBy.get(u.id) ?? 0,
        shop: v
          ? {
              id: v.id as string,
              businessName: v.business_name as string,
              verifiedAt: (v.verified_at as string | null) ?? null,
              insured: !!v.insured,
              licensed: !!v.licensed,
              insuranceExpiry: (v.insurance_expiry as string | null) ?? null,
              phone: (v.phone as string | null) ?? "",
              bids: stats?.n ?? 0,
              won: stats?.won ?? 0,
              workOrders: woBy.get(v.id as string) ?? 0,
              lastBidAt: stats?.last ?? null,
            }
          : undefined,
      };
    });
    people.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ people });
  } catch (e) {
    fail(res, e);
  }
};

/** GET /api/admin/people/:id/detail → an owner's boats, their service history and what they've spent. */
export const handleAdminPersonDetail: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const id = String(req.params.id);
    const [boats, records, projects] = await Promise.all([
      ctx.db.from("boats").select("id, name, make, model, year, engine_make, engine_model, engine_count, engine_type, length_ft, home_port, hull_id, photo_url, created_at").eq("owner_id", id).order("created_at"),
      ctx.db.from("service_records").select("id, boat_id, title, category, date, cost, vendor_name, source, engine_hours, labor_hours").eq("owner_id", id).order("date", { ascending: false }).limit(500),
      ctx.db.from("projects").select("id, title, status, category, created_at, chosen_bid_id, bids:bids!bids_project_id_fkey(id, price, vendor_id)").eq("owner_id", id).order("created_at", { ascending: false }),
    ]);
    for (const r of [boats, records, projects]) if (r.error) throw r.error;
    const recs = (records.data ?? []) as { id: string; boat_id: string; title: string; category: string | null; date: string; cost: number | null; vendor_name: string | null; source: string; engine_hours: number | null; labor_hours: number | null }[];
    const spendByBoat = new Map<string, { total: number; jobs: number; last: string | null }>();
    for (const r of recs) {
      const cur = spendByBoat.get(r.boat_id) ?? { total: 0, jobs: 0, last: null };
      cur.total += Number(r.cost ?? 0);
      cur.jobs += 1;
      if (!cur.last || r.date > cur.last) cur.last = r.date;
      spendByBoat.set(r.boat_id, cur);
    }
    const jobs = ((projects.data ?? []) as unknown as { id: string; title: string; status: string; category: string | null; created_at: string; chosen_bid_id: string | null; bids: { id: string; price: number }[] | null }[]).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      category: p.category,
      createdAt: p.created_at,
      bids: p.bids?.length ?? 0,
      acceptedPrice: p.chosen_bid_id ? p.bids?.find((b) => b.id === p.chosen_bid_id)?.price ?? null : null,
    }));
    res.json({
      boats: (boats.data ?? []).map((b) => ({
        id: b.id,
        label: [b.year, b.make, b.model].filter(Boolean).join(" "),
        name: b.name,
        engines: [b.engine_count && b.engine_count > 1 ? `${b.engine_count}×` : "", b.engine_make, b.engine_model].filter(Boolean).join(" ") || b.engine_type || "",
        lengthFt: b.length_ft,
        homePort: b.home_port,
        hullId: b.hull_id,
        photoUrl: b.photo_url,
        addedAt: b.created_at,
        spend: spendByBoat.get(b.id)?.total ?? 0,
        services: spendByBoat.get(b.id)?.jobs ?? 0,
        lastService: spendByBoat.get(b.id)?.last ?? null,
      })),
      records: recs.map((r) => ({ id: r.id, boatId: r.boat_id, title: r.title, category: r.category, date: r.date, cost: r.cost, vendor: r.vendor_name, source: r.source, engineHours: r.engine_hours })),
      jobs,
      totals: {
        spend: recs.reduce((s, r) => s + Number(r.cost ?? 0), 0),
        services: recs.length,
        verified: recs.filter((r) => r.source !== "owner").length,
        bosunSpend: jobs.reduce((s, j) => s + (j.acceptedPrice ?? 0), 0),
      },
    });
  } catch (e) {
    fail(res, e);
  }
};

export const handleAdminPersonAction: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const { db } = ctx;
    const id = String(req.params.id);
    const action = String((req.body ?? {}).action ?? "") as AdminAction;
    const { data: profile } = await db.from("profiles").select("email, name").eq("id", id).maybeSingle();
    const label = profile?.name || profile?.email || id;
    if (id === ctx.admin.id && (action === "remove-admin" || action === "suspend" || action === "delete")) {
      res.status(400).json({ error: "You can't do that to your own account." });
      return;
    }
    switch (action) {
      case "make-admin":
      case "remove-admin": {
        const { error } = await db.from("profiles").update({ is_admin: action === "make-admin" }).eq("id", id);
        if (error) throw error;
        break;
      }
      case "suspend":
      case "reinstate": {
        const { error } = await db.auth.admin.updateUserById(id, { ban_duration: action === "suspend" ? "87600h" : "none" });
        if (error) throw error;
        break;
      }
      case "verify":
      case "unverify": {
        const { error } = await db.from("vendor_profiles").update({ verified_at: action === "verify" ? new Date().toISOString() : null }).eq("user_id", id);
        if (error) throw error;
        break;
      }
      case "reset-password": {
        if (!profile?.email) throw new Error("No email on this account.");
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
        const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
        const site = process.env.SITE_URL || "https://bosunapp.vercel.app";
        const { error } = await createClient(url, anon).auth.resetPasswordForEmail(profile.email, { redirectTo: `${site}/login` });
        if (error) throw error;
        break;
      }
      case "delete": {
        const { error } = await db.auth.admin.deleteUser(id);
        if (error) throw error;
        break;
      }
      default:
        res.status(400).json({ error: `Unknown action "${action}".` });
        return;
    }
    await audit(ctx, action, id, label);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
};

/* ── Demand ───────────────────────────────────────────────────────────────── */

export const handleAdminDemand: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const { data, error } = await ctx.db
      .from("projects")
      .select("id, title, category, status, created_at, lat, lng, location, bids:bids!bids_project_id_fkey(vendor_id)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    const projects: DemandProject[] = ((data ?? []) as unknown as {
      id: string; title: string; category: string | null; status: string; created_at: string; lat: number | null; lng: number | null; location: string | null; bids: { vendor_id: string }[] | null;
    }[]).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status,
      createdAt: p.created_at,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      location: p.location,
      bids: p.bids?.length ?? 0,
      bidders: new Set((p.bids ?? []).map((b) => b.vendor_id)).size,
    }));
    res.json({ projects });
  } catch (e) {
    fail(res, e);
  }
};

/* ── Prospects ────────────────────────────────────────────────────────────── */

function mapProspect(r: Record<string, unknown>): Prospect {
  return {
    id: r.id as string,
    placeId: (r.place_id as string | null) ?? null,
    name: r.name as string,
    address: (r.address as string) ?? "",
    phone: (r.phone as string) ?? "",
    website: (r.website as string) ?? "",
    lat: (r.lat as number | null) ?? null,
    lng: (r.lng as number | null) ?? null,
    rating: r.rating == null ? null : Number(r.rating),
    reviewCount: Number(r.review_count ?? 0),
    trades: (r.trades as string[]) ?? [],
    area: (r.area as string) ?? "",
    status: r.status as Prospect["status"],
    notes: (r.notes as string) ?? "",
    nextFollowUp: (r.next_follow_up as string | null) ?? null,
    assignedTo: (r.assigned_to as string) ?? "",
    convertedVendorId: (r.converted_vendor_id as string | null) ?? null,
    lastContactedAt: (r.last_contacted_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export const handleAdminProspects: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const { data, error } = await ctx.db.from("prospects").select("*").order("created_at", { ascending: false }).limit(5000);
    if (error) throw error;
    res.json({ prospects: (data ?? []).map((r) => mapProspect(r as Record<string, unknown>)), placesConfigured: !!placesKey() });
  } catch (e) {
    fail(res, e);
  }
};

export const handleAdminProspectUpdate: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const id = String(req.params.id);
    const b = (req.body ?? {}) as Partial<Prospect>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (b.status) patch.status = b.status;
    if (b.notes != null) patch.notes = b.notes;
    if ("nextFollowUp" in b) patch.next_follow_up = b.nextFollowUp || null;
    if (b.assignedTo != null) patch.assigned_to = b.assignedTo;
    if (b.status === "contacted" || b.status === "interested") patch.last_contacted_at = new Date().toISOString();
    if (b.name) patch.name = b.name;
    if (b.phone != null) patch.phone = b.phone;
    if (b.website != null) patch.website = b.website;
    const { data, error } = await ctx.db.from("prospects").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    if (b.status) await audit(ctx, `prospect:${b.status}`, id, data.name as string);
    res.json({ prospect: mapProspect(data as Record<string, unknown>) });
  } catch (e) {
    fail(res, e);
  }
};

export const handleAdminProspectCreate: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const b = (req.body ?? {}) as Partial<Prospect>;
    if (!b.name?.trim()) {
      res.status(400).json({ error: "A name is required." });
      return;
    }
    const { data, error } = await ctx.db
      .from("prospects")
      .insert({ name: b.name.trim(), address: b.address ?? "", phone: b.phone ?? "", website: b.website ?? "", area: b.area ?? "", trades: b.trades ?? [], notes: b.notes ?? "", lat: b.lat ?? null, lng: b.lng ?? null })
      .select("*")
      .single();
    if (error) throw error;
    await audit(ctx, "prospect:add", data.id as string, data.name as string);
    res.json({ prospect: mapProspect(data as Record<string, unknown>) });
  } catch (e) {
    fail(res, e);
  }
};

function placesKey(): string {
  return process.env.GOOGLE_PLACES_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

interface PlaceResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  businessStatus?: string;
  types?: string[];
}

// Google place types that are never a service shop: rentals, attractions, retail.
const NOT_A_SHOP = new Set([
  "boat_rental", "tourist_attraction", "park", "stadium", "amusement_park", "hardware_store", "sporting_goods_store",
  "shopping_mall", "department_store", "restaurant", "bar", "hotel", "lodging", "gas_station", "convenience_store",
]);
const RETAIL_ONLY = new Set(["store", "home_goods_store", "electronics_store"]);
const SERVICE_HINTS = new Set(["car_repair", "boat_dealer", "marina", "establishment", "point_of_interest"]);

function looksLikeShop(p: PlaceResult): boolean {
  const types = p.types ?? [];
  if (types.some((t) => NOT_A_SHOP.has(t))) return false;
  // A plain store with no service/marine type (West Marine, chandleries) sells parts, not labor.
  if (types.some((t) => RETAIL_ONLY.has(t)) && !types.some((t) => ["car_repair", "boat_dealer", "marina"].includes(t))) {
    const name = (p.displayName?.text ?? "").toLowerCase();
    if (!/repair|service|mechanic|yard|marine services|boatworks|boat works/.test(name)) return false;
  }
  void SERVICE_HINTS;
  return true;
}

/** "Rickenbacker Marina, Rickenbacker Causeway, Miami, FL, USA" → "Miami, FL". */
function shortArea(label: string, lat: number, lng: number): string {
  const known = areaName(lat, lng, null);
  if (!/^-?\d/.test(known) && known !== "Unknown area") return known;
  const parts = label.split(",").map((s) => s.trim()).filter((s) => s && s !== "USA");
  return parts.length >= 2 ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}` : label;
}

async function searchPlaces(textQuery: string, lat: number, lng: number, radiusMiles: number): Promise<PlaceResult[]> {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": placesKey(),
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,places.businessStatus,places.types",
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 20,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(50000, radiusMiles * 1609) } },
    }),
  });
  const body = (await r.json()) as { places?: PlaceResult[]; error?: { message?: string } };
  if (!r.ok) throw new Error(body.error?.message ?? `Places search failed (${r.status})`);
  return body.places ?? [];
}

/**
 * POST /api/admin/prospects/search { area, lat, lng, radiusMiles, trades: string[] }
 * Finds marine service businesses around a point and files the new ones as prospects.
 */
export const handleAdminProspectSearch: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    if (!placesKey()) {
      res.status(503).json({ error: "Set GOOGLE_PLACES_SERVER_KEY (a server key with Places API (New) enabled) to search for shops.", code: "not_configured" });
      return;
    }
    const b = (req.body ?? {}) as { area?: string; lat?: number; lng?: number; radiusMiles?: number; trades?: string[] };
    if (typeof b.lat !== "number" || typeof b.lng !== "number") {
      res.status(400).json({ error: "Pick an area first." });
      return;
    }
    const trades = (b.trades?.length ? b.trades : PROSPECT_TRADES.map((t) => t.key)).filter((k) => PROSPECT_TRADES.some((t) => t.key === k));
    const searchNear = b.area?.trim() || areaName(b.lat, b.lng, null);
    const area = shortArea(searchNear, b.lat, b.lng);
    const found = new Map<string, { place: PlaceResult; trades: Set<string> }>();
    let skipped = 0;
    for (const key of trades) {
      const q = PROSPECT_TRADES.find((t) => t.key === key)!.query;
      const places = await searchPlaces(`${q} near ${searchNear}`, b.lat, b.lng, b.radiusMiles ?? 25);
      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        if (!looksLikeShop(p)) {
          skipped += 1;
          continue;
        }
        const cur = found.get(p.id) ?? { place: p, trades: new Set<string>() };
        cur.trades.add(key);
        found.set(p.id, cur);
      }
    }
    // Shops already on Bosun are not prospects.
    const { data: vendors } = await ctx.db.from("vendor_profiles").select("id, business_name, phone");
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const onBosun = new Map((vendors ?? []).map((v) => [norm(v.business_name as string), v.id as string]));
    const phones = new Map((vendors ?? []).filter((v) => v.phone).map((v) => [String(v.phone).replace(/\D/g, ""), v.id as string]));
    const rows = [...found.values()].map(({ place, trades: t }) => {
      const phone = place.nationalPhoneNumber ?? "";
      const existing = onBosun.get(norm(place.displayName?.text ?? "")) ?? phones.get(phone.replace(/\D/g, "")) ?? null;
      return {
        place_id: place.id,
        name: place.displayName?.text ?? "Unnamed",
        address: place.formattedAddress ?? "",
        phone,
        website: place.websiteUri ?? "",
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        rating: place.rating ?? null,
        review_count: place.userRatingCount ?? 0,
        trades: [...t],
        area,
        ...(existing ? { status: "onboarded", converted_vendor_id: existing } : {}),
        updated_at: new Date().toISOString(),
      };
    });
    let added = 0;
    if (rows.length) {
      // Keep status/notes on rows we already have: insert new ones only, then refresh the facts on the rest.
      const { data: existingRows } = await ctx.db.from("prospects").select("place_id").in("place_id", rows.map((r) => r.place_id));
      const have = new Set((existingRows ?? []).map((r) => r.place_id as string));
      const fresh = rows.filter((r) => !have.has(r.place_id));
      if (fresh.length) {
        const { error } = await ctx.db.from("prospects").insert(fresh);
        if (error) throw error;
        added = fresh.length;
      }
      for (const r of rows.filter((x) => have.has(x.place_id))) {
        const { status: _s, converted_vendor_id: _c, ...facts } = r as typeof r & { status?: string; converted_vendor_id?: string };
        await ctx.db.from("prospects").update(facts).eq("place_id", r.place_id);
      }
    }
    await audit(ctx, "prospect:search", null, area, { trades, found: rows.length, added, skipped });
    res.json({ found: rows.length, added });
  } catch (e) {
    fail(res, e);
  }
};

/** POST /api/admin/prospects/:id/draft { demand: string[] } → a short outreach email and text. */
export const handleAdminProspectDraft: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({ error: "ANTHROPIC_API_KEY isn't set, so drafts aren't available.", code: "not_configured" });
      return;
    }
    const { data: p, error } = await ctx.db.from("prospects").select("*").eq("id", String(req.params.id)).single();
    if (error) throw error;
    const demand = ((req.body ?? {}).demand as string[] | undefined) ?? [];
    const sender = (req.body ?? {}).sender as string | undefined;
    const prompt = `You write short, plain outreach for Bosun, a marketplace where boat owners post service jobs and local marine shops bid on them. Shops pay $99 a month for the shop software (work orders, scheduling, parts tracking, invoicing, QuickBooks export) and a fee only on a new customer's first year of work (10% of the first job, 5% after, nothing once the year is up). Repeat customers are never charged. Founding shops in the South Florida pilot get it on us.

Write to this shop:
Name: ${p.name}
Address: ${p.address || "unknown"}
Trades: ${(p.trades as string[]).join(", ") || "marine service"}
Google rating: ${p.rating ?? "n/a"} (${p.review_count} reviews)

Open demand near them on Bosun right now:
${demand.length ? demand.map((d) => `- ${d}`).join("\n") : "- (no specific numbers; keep it general)"}

Return JSON only: {"subject": string, "email": string, "text": string}. The email is 90–130 words, friendly, no hype, names one or two concrete demand facts if given, ends with a one-line ask to reply or book a 15-minute call. The text is an SMS under 300 characters. Sign as ${sender || "the Bosun team"}. No placeholders in square brackets.`;
    const quota = await consumeQuota(ctx.db, ctx.admin.id, "outreach");
    if (!quota.allowed) {
      res.status(429).json({ error: quota.message, code: "quota" });
      return;
    }
    const client = new Anthropic();
    const model = "claude-opus-5-5";
    let msg: Anthropic.Message;
    try {
      msg = await client.messages.create({ model, max_tokens: 800, messages: [{ role: "user", content: prompt }] });
    } catch (e) {
      await recordUsage(ctx.db, quota.usageId, { status: "failed", model, note: e instanceof Error ? e.message : String(e) });
      throw e;
    }
    await recordUsage(ctx.db, quota.usageId, { status: "ok", model: msg.model, usage: usageOf(msg), note: p.name as string });
    const text = msg.content.map((c) => ("text" in c ? c.text : "")).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const draft = JSON.parse(text.slice(start, end + 1)) as { subject: string; email: string; text: string };
    res.json({ draft });
  } catch (e) {
    fail(res, e);
  }
};

/** GET /api/admin/ai-usage → 30 days of Claude calls rolled up, who made them, and the limits in force. */
export const handleAdminAiUsage: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [usage, limits] = await Promise.all([
      ctx.db.from("ai_usage").select("id, user_id, kind, status, model, input_tokens, output_tokens, cost_usd, note, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
      ctx.db.from("ai_limits").select("kind, per_day, per_month"),
    ]);
    if (usage.error) throw usage.error;
    if (limits.error) throw limits.error;
    const rows: AiUsageRow[] = (usage.data ?? []).map((r) => ({
      id: r.id as string,
      userId: (r.user_id as string | null) ?? null,
      kind: r.kind as AiKind,
      status: r.status as AiStatus,
      model: (r.model as string | null) ?? null,
      inputTokens: Number(r.input_tokens ?? 0),
      outputTokens: Number(r.output_tokens ?? 0),
      costUsd: Number(r.cost_usd ?? 0),
      note: (r.note as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
    const summary = summarizeAiUsage(rows);
    const ids = summary.spenders.map((s) => s.userId);
    const { data: profiles } = ids.length ? await ctx.db.from("profiles").select("id, name, email").in("id", ids) : { data: [] };
    const people: Record<string, { name: string; email: string }> = {};
    for (const p of profiles ?? []) people[p.id as string] = { name: (p.name as string) ?? "", email: (p.email as string) ?? "" };
    res.json({
      configured: !!process.env.ANTHROPIC_API_KEY,
      summary,
      people,
      limits: (limits.data ?? []).map((l): AiLimit => ({ kind: l.kind as AiKind, perDay: Number(l.per_day), perMonth: Number(l.per_month) })),
      recent: rows.slice(0, 60),
    });
  } catch (e) {
    fail(res, e);
  }
};

export const handleAdminAudit: RequestHandler = async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const { data, error } = await ctx.db.from("admin_audit").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    const ids = [...new Set((data ?? []).map((r) => r.admin_id as string))];
    const { data: admins } = ids.length ? await ctx.db.from("profiles").select("id, name, email").in("id", ids) : { data: [] };
    const by = new Map((admins ?? []).map((a) => [a.id as string, (a.name as string) || (a.email as string)]));
    res.json({
      entries: (data ?? []).map((r) => ({
        id: r.id,
        admin: by.get(r.admin_id as string) ?? "Admin",
        action: r.action,
        targetId: r.target_id,
        targetLabel: r.target_label,
        detail: r.detail,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    fail(res, e);
  }
};
