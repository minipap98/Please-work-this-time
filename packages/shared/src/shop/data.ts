// Shop OS data: the Supabase reads and writes behind work orders, inventory, inbound parts,
// customers and boats, and the tech view. Both apps call these; the web wraps them in React
// Query hooks (client/hooks/use-shop.ts), the iOS app in src/lib/shop.ts.

import type { Db } from "../db/client";
import type { Tables } from "../database.types";
import type { MarketInput } from "../insights";
import {
  advanceStatus,
  type Carrier,
  type InventoryItem,
  type LineKind,
  type PartsShipment,
  type ShipmentStatus,
  type ShopBoat,
  type ShopCustomer,
  type WorkOrder,
  type WorkOrderStatus,
} from "../shop";
import type { CrewMembership } from "./crew";
import { DONE_STATUSES, appendTechNote, type ShipmentDraft, type WorkOrderDraft } from "./drafts";
import type { ShopSettings } from "./settings";

// ── Row mapping ──────────────────────────────────────────────────────────────

export type WorkOrderRow = Tables<"shop_work_orders"> & { lines?: Tables<"shop_work_order_lines">[] | null };

export function mapSettings(r: Tables<"shop_settings">): ShopSettings {
  return {
    inboundEmailToken: r.inbound_email_token,
    laborRate: Number(r.labor_rate) || 0,
    taxRate: Number(r.tax_rate) || 0,
    bays: r.bays ?? [],
    techs: r.techs ?? [],
    qbLaborItem: r.qb_labor_item,
    qbPartsItem: r.qb_parts_item,
    qbFeeItem: r.qb_fee_item,
  };
}

export function mapInventory(r: Tables<"shop_inventory">): InventoryItem {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category,
    binLocation: r.bin_location,
    qtyOnHand: Number(r.qty_on_hand) || 0,
    reorderPoint: Number(r.reorder_point) || 0,
    unitCost: Number(r.unit_cost) || 0,
    unitPrice: Number(r.unit_price) || 0,
    supplier: r.supplier,
    updatedAt: r.updated_at,
  };
}

export function mapWorkOrder(r: WorkOrderRow): WorkOrder {
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    description: r.description,
    status: r.status as WorkOrderStatus,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    boatLabel: r.boat_label,
    boatId: r.boat_id ?? null,
    projectId: r.project_id,
    assignedTo: r.assigned_to,
    bay: r.bay,
    scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end,
    engineHours: r.engine_hours,
    taxRate: Number(r.tax_rate) || 0,
    completedAt: r.completed_at,
    exportedAt: r.exported_at,
    invoicedAt: r.invoiced_at ?? null,
    paidAt: r.paid_at ?? null,
    paymentMethod: r.payment_method ?? "",
    createdAt: r.created_at,
    lines: [...(r.lines ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => ({
        id: l.id,
        kind: l.kind as LineKind,
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unit_price) || 0,
        inventoryItemId: l.inventory_item_id,
      })),
  };
}

export function mapShipment(r: Tables<"shop_parts_shipments">): PartsShipment {
  return {
    id: r.id,
    supplier: r.supplier,
    description: r.description,
    carrier: r.carrier as Carrier,
    trackingNumber: r.tracking_number,
    status: r.status as ShipmentStatus,
    eta: r.eta,
    workOrderId: r.work_order_id,
    boatLabel: r.boat_label ?? "",
    customerName: r.customer_name ?? "",
    inventoryItemId: r.inventory_item_id,
    quantity: Number(r.quantity) || 0,
    source: r.source as "manual" | "email",
    emailSubject: r.email_subject,
    receivedAt: r.received_at,
    createdAt: r.created_at,
  };
}

export function mapCustomer(r: Tables<"shop_customers">): ShopCustomer {
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, notes: r.notes, createdAt: r.created_at };
}

export function mapBoat(r: Tables<"shop_boats">): ShopBoat {
  return {
    id: r.id,
    customerId: r.customer_id,
    name: r.name,
    year: r.year,
    make: r.make,
    model: r.model,
    engine: r.engine,
    hullId: r.hull_id,
    slip: r.slip,
    createdAt: r.created_at,
  };
}

// ── Settings ─────────────────────────────────────────────────────────────────

/** The shop's settings, created with defaults the first time they're asked for. */
export async function getShopSettings(client: Db, vendorId: string): Promise<ShopSettings> {
  const { data, error } = await client.from("shop_settings").select("*").eq("vendor_id", vendorId).maybeSingle();
  if (error) throw error;
  if (data) return mapSettings(data);
  const { data: created, error: insertError } = await client.from("shop_settings").insert({ vendor_id: vendorId }).select().single();
  if (insertError) throw insertError;
  return mapSettings(created);
}

export async function updateShopSettings(client: Db, vendorId: string, patch: Partial<Omit<ShopSettings, "inboundEmailToken">>): Promise<void> {
  const { error } = await client
    .from("shop_settings")
    .update({
      ...(patch.laborRate !== undefined && { labor_rate: patch.laborRate }),
      ...(patch.taxRate !== undefined && { tax_rate: patch.taxRate }),
      ...(patch.bays && { bays: patch.bays }),
      ...(patch.techs && { techs: patch.techs }),
      ...(patch.qbLaborItem !== undefined && { qb_labor_item: patch.qbLaborItem }),
      ...(patch.qbPartsItem !== undefined && { qb_parts_item: patch.qbPartsItem }),
      ...(patch.qbFeeItem !== undefined && { qb_fee_item: patch.qbFeeItem }),
      updated_at: new Date().toISOString(),
    })
    .eq("vendor_id", vendorId);
  if (error) throw error;
}

// ── Inventory ────────────────────────────────────────────────────────────────

export type InventoryDraft = Omit<InventoryItem, "id" | "updatedAt"> & { id?: string };

export async function listInventory(client: Db, vendorId: string): Promise<InventoryItem[]> {
  const { data, error } = await client.from("shop_inventory").select("*").eq("vendor_id", vendorId).order("name");
  if (error) throw error;
  return (data ?? []).map(mapInventory);
}

export async function saveInventoryItem(client: Db, vendorId: string, item: InventoryDraft): Promise<void> {
  const row = {
    vendor_id: vendorId,
    sku: item.sku,
    name: item.name,
    category: item.category,
    bin_location: item.binLocation,
    qty_on_hand: item.qtyOnHand,
    reorder_point: item.reorderPoint,
    unit_cost: item.unitCost,
    unit_price: item.unitPrice,
    supplier: item.supplier,
    updated_at: new Date().toISOString(),
  };
  const { error } = item.id ? await client.from("shop_inventory").update(row).eq("id", item.id) : await client.from("shop_inventory").insert(row);
  if (error) throw error;
}

export async function deleteInventoryItem(client: Db, id: string): Promise<void> {
  const { error } = await client.from("shop_inventory").delete().eq("id", id);
  if (error) throw error;
}

/** Counter taps go through the RPC so two devices never clobber each other. */
export async function adjustInventory(client: Db, id: string, delta: number): Promise<void> {
  const { error } = await client.rpc("shop_adjust_inventory", { item_id: id, delta });
  if (error) throw error;
}

// ── Work orders ──────────────────────────────────────────────────────────────

const WORK_ORDER_SELECT = "*, lines:shop_work_order_lines(*)";

export async function listWorkOrders(client: Db, vendorId: string): Promise<WorkOrder[]> {
  const { data, error } = await client.from("shop_work_orders").select(WORK_ORDER_SELECT).eq("vendor_id", vendorId).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as WorkOrderRow[]).map(mapWorkOrder);
}

async function setStatusLive(client: Db, id: string, status: WorkOrderStatus): Promise<void> {
  const { data: current } = await client.from("shop_work_orders").select("status, completed_at").eq("id", id).single();
  const now = new Date().toISOString();
  const patch: Partial<Tables<"shop_work_orders">> = { status, updated_at: now };
  if (DONE_STATUSES.includes(status) && !current?.completed_at) patch.completed_at = now;
  if (!DONE_STATUSES.includes(status)) patch.completed_at = null;
  const { error } = await client.from("shop_work_orders").update(patch).eq("id", id);
  if (error) throw error;
}

/** Insert or update the header and rewrite the lines; returns the order's id. */
export async function saveWorkOrder(client: Db, vendorId: string, draft: WorkOrderDraft): Promise<string> {
  const now = new Date().toISOString();
  const header = {
    vendor_id: vendorId,
    number: draft.number,
    project_id: draft.projectId ?? null,
    title: draft.title,
    description: draft.description,
    customer_name: draft.customerName,
    customer_email: draft.customerEmail,
    boat_label: draft.boatLabel,
    boat_id: draft.boatId ?? null,
    assigned_to: draft.assignedTo,
    bay: draft.bay,
    scheduled_start: draft.scheduledStart,
    scheduled_end: draft.scheduledEnd,
    engine_hours: draft.engineHours,
    tax_rate: draft.taxRate,
    updated_at: now,
  };

  // Lines are written before the status flips to completed so the logbook trigger sees the itemized job.
  let id = draft.id;
  if (id) {
    const { error } = await client.from("shop_work_orders").update(header).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await client
      .from("shop_work_orders")
      .insert({ ...header, status: DONE_STATUSES.includes(draft.status) ? "in-progress" : draft.status })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }

  const { error: delError } = await client.from("shop_work_order_lines").delete().eq("work_order_id", id);
  if (delError) throw delError;
  if (draft.lines.length > 0) {
    const { error: lineError } = await client.from("shop_work_order_lines").insert(
      draft.lines.map((l, i) => ({
        work_order_id: id!,
        kind: l.kind,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        inventory_item_id: l.kind === "part" ? (l.inventoryItemId ?? null) : null,
        sort_order: i,
      })),
    );
    if (lineError) throw lineError;
  }

  await setStatusLive(client, id, draft.status);
  return id;
}

export async function setWorkOrderStatus(client: Db, id: string, status: WorkOrderStatus): Promise<void> {
  await setStatusLive(client, id, status);
}

/** Lines go first so the inventory trigger returns parts to the shelf. */
export async function deleteWorkOrder(client: Db, id: string): Promise<void> {
  const { error: lineError } = await client.from("shop_work_order_lines").delete().eq("work_order_id", id);
  if (lineError) throw lineError;
  const { error } = await client.from("shop_work_orders").delete().eq("id", id);
  if (error) throw error;
}

export type BillingAction = { id: string; action: "invoice" } | { id: string; action: "paid"; method: string } | { id: string; action: "unpaid" };

/** Invoice sent, payment received, or payment undone. */
export async function billWorkOrder(client: Db, a: BillingAction): Promise<void> {
  const now = new Date().toISOString();
  const row: Partial<Tables<"shop_work_orders">> = { updated_at: now };
  if (a.action === "invoice") {
    row.status = "invoiced";
    row.invoiced_at = now;
  } else if (a.action === "paid") {
    row.paid_at = now;
    row.payment_method = a.method;
  } else {
    row.paid_at = null;
    row.payment_method = "";
  }
  const { error } = await client.from("shop_work_orders").update(row).eq("id", a.id);
  if (error) throw error;
}

export async function markExported(client: Db, ids: string[]): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client.from("shop_work_orders").update({ exported_at: now, status: "invoiced", updated_at: now }).in("id", ids);
  if (error) throw error;
}

// ── Inbound parts ────────────────────────────────────────────────────────────

export async function listShipments(client: Db, vendorId: string): Promise<PartsShipment[]> {
  const { data, error } = await client.from("shop_parts_shipments").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapShipment);
}

/** Insert, or merge by tracking number so a re-pasted email just advances the status. */
export async function saveShipment(client: Db, vendorId: string, draft: ShipmentDraft): Promise<void> {
  const row = {
    vendor_id: vendorId,
    supplier: draft.supplier,
    description: draft.description,
    carrier: draft.carrier,
    tracking_number: draft.trackingNumber,
    status: draft.status,
    eta: draft.eta,
    work_order_id: draft.workOrderId,
    boat_label: draft.boatLabel,
    customer_name: draft.customerName,
    inventory_item_id: draft.inventoryItemId,
    quantity: draft.quantity,
    source: draft.source,
    email_subject: draft.emailSubject,
    updated_at: new Date().toISOString(),
  };
  let existingId = draft.id;
  let existingStatus: ShipmentStatus | null = null;
  if (!existingId && draft.trackingNumber) {
    const { data } = await client
      .from("shop_parts_shipments")
      .select("id, status")
      .eq("vendor_id", vendorId)
      .eq("tracking_number", draft.trackingNumber)
      .maybeSingle();
    existingId = data?.id;
    existingStatus = (data?.status as ShipmentStatus) ?? null;
  }
  if (existingId) {
    const { error } = await client
      .from("shop_parts_shipments")
      .update({ ...row, status: existingStatus ? advanceStatus(existingStatus, draft.status) : draft.status })
      .eq("id", existingId);
    if (error) throw error;
  } else {
    const { error } = await client.from("shop_parts_shipments").insert(row);
    if (error) throw error;
  }
}

/** Check a shipment in: delivered, and linked stock goes on the shelf (trigger). */
export async function receiveShipment(client: Db, id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client.from("shop_parts_shipments").update({ received_at: now, status: "delivered", updated_at: now }).eq("id", id).is("received_at", null);
  if (error) throw error;
}

export async function deleteShipment(client: Db, id: string): Promise<void> {
  const { error } = await client.from("shop_parts_shipments").delete().eq("id", id);
  if (error) throw error;
}

// ── Customers and boats on file ──────────────────────────────────────────────

export type CustomerDraft = Omit<ShopCustomer, "id" | "createdAt"> & { id?: string };
export type BoatDraft = Omit<ShopBoat, "id" | "customerId" | "createdAt"> & { id?: string; customerId?: string };

export async function listCustomers(client: Db, vendorId: string): Promise<ShopCustomer[]> {
  const { data, error } = await client.from("shop_customers").select("*").eq("vendor_id", vendorId).order("name");
  if (error) throw error;
  return (data ?? []).map(mapCustomer);
}

export async function listShopBoats(client: Db, vendorId: string): Promise<ShopBoat[]> {
  const { data, error } = await client.from("shop_boats").select("*").eq("vendor_id", vendorId).order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapBoat);
}

/** Saves a customer and, optionally, boats for them. Returns the saved ids. */
export async function saveCustomer(
  client: Db,
  vendorId: string,
  input: { customer: CustomerDraft; boats?: BoatDraft[] },
): Promise<{ customerId: string; boatIds: string[] }> {
  const now = new Date().toISOString();
  const { customer, boats = [] } = input;
  const row = { vendor_id: vendorId, name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim(), notes: customer.notes, updated_at: now };
  let customerId = customer.id;
  if (customerId) {
    const { error } = await client.from("shop_customers").update(row).eq("id", customerId);
    if (error) throw error;
  } else {
    const { data, error } = await client.from("shop_customers").insert(row).select("id").single();
    if (error) throw error;
    customerId = data.id;
  }
  const boatIds: string[] = [];
  for (const b of boats) {
    const brow = {
      vendor_id: vendorId,
      customer_id: customerId,
      name: b.name.trim(),
      year: b.year,
      make: b.make.trim(),
      model: b.model.trim(),
      engine: b.engine.trim(),
      hull_id: b.hullId.trim(),
      slip: b.slip.trim(),
      updated_at: now,
    };
    if (b.id) {
      const { error } = await client.from("shop_boats").update(brow).eq("id", b.id);
      if (error) throw error;
      boatIds.push(b.id);
    } else {
      const { data, error } = await client.from("shop_boats").insert(brow).select("id").single();
      if (error) throw error;
      boatIds.push(data.id);
    }
  }
  return { customerId, boatIds };
}

export async function deleteShopBoat(client: Db, id: string): Promise<void> {
  const { error } = await client.from("shop_boats").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteCustomer(client: Db, id: string): Promise<void> {
  const { error } = await client.from("shop_customers").delete().eq("id", id);
  if (error) throw error;
}

// ── Tech view ────────────────────────────────────────────────────────────────

/** A crew member's own jobs at one shop, soonest first. */
export async function listTechJobs(client: Db, m: Pick<CrewMembership, "vendorId" | "techName">): Promise<WorkOrder[]> {
  const { data, error } = await client
    .from("shop_work_orders")
    .select(WORK_ORDER_SELECT)
    .eq("vendor_id", m.vendorId)
    .eq("assigned_to", m.techName)
    .order("scheduled_start", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as WorkOrderRow[]).map(mapWorkOrder);
}

/** A tech moves their own job along and/or adds a note (notes show in the owner's Boat Log). */
export async function techUpdateJob(client: Db, input: { order: WorkOrder; status?: WorkOrderStatus; note?: string }): Promise<void> {
  const { order, status, note } = input;
  const now = new Date().toISOString();
  const patch: Partial<Tables<"shop_work_orders">> = { description: appendTechNote(order.description, order.assignedTo, note ?? ""), updated_at: now };
  if (status) {
    patch.status = status;
    if (DONE_STATUSES.includes(status) && !order.completedAt) patch.completed_at = now;
  }
  const { error } = await client.from("shop_work_orders").update(patch).eq("id", order.id);
  if (error) throw error;
}

// ── Insights ─────────────────────────────────────────────────────────────────

/** My bids plus anonymized market aggregates; the function only ever returns the caller's own rows. */
export async function getMarketInsights(client: Db): Promise<MarketInput | null> {
  const { data, error } = await client.rpc("vendor_market_insights");
  if (error) throw error;
  return (data as unknown as MarketInput | null) ?? null;
}
