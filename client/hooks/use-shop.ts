import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import type { Tables } from "@/lib/database.types";
import {
  advanceStatus,
  inventoryDelta,
  type Carrier,
  type InventoryItem,
  type LineKind,
  type PartsShipment,
  type ShipmentStatus,
  type WorkOrder,
  type WorkOrderLine,
  type WorkOrderStatus,
} from "@shared/shop";
import {
  DEFAULT_SHOP_SETTINGS,
  demoInventory,
  demoShipments,
  demoWorkOrders,
  type ShopSettings,
} from "@/data/shopDemoData";

// ── Demo store (browser only; demo mode never writes to Supabase) ──────────

const DEMO_KEY = "bosun_demo_shop_v1";

interface DemoShop {
  settings: ShopSettings;
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  shipments: PartsShipment[];
}

function loadDemo(): DemoShop {
  let shop: DemoShop | null = null;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) shop = JSON.parse(raw) as DemoShop;
  } catch {
    // fall through to seed
  }
  shop ??= {
    settings: DEFAULT_SHOP_SETTINGS,
    inventory: demoInventory(),
    workOrders: demoWorkOrders(),
    shipments: demoShipments(),
  };
  shop.shipments = shop.shipments.map((sh) => pairWithBoat({ ...sh, boatLabel: sh.boatLabel ?? "", customerName: sh.customerName ?? "" }, shop!.workOrders));
  return shop;
}

/** Same rule as the DB trigger: a shipment on a work order carries that order's boat and customer. */
function pairWithBoat<T extends Pick<PartsShipment, "workOrderId" | "boatLabel" | "customerName">>(
  sh: T,
  orders: WorkOrder[]
): T {
  const wo = sh.workOrderId ? orders.find((o) => o.id === sh.workOrderId) : undefined;
  if (sh.workOrderId && !wo) return { ...sh, workOrderId: null };
  return wo ? { ...sh, boatLabel: wo.boatLabel, customerName: wo.customerName } : sh;
}

function saveDemo(next: DemoShop) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

function mutateDemo(fn: (s: DemoShop) => void): DemoShop {
  const s = loadDemo();
  fn(s);
  saveDemo(s);
  return s;
}

export function resetDemoShop() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    // ignore
  }
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function db() {
  if (supabaseMissing || !supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ── Row mapping ──────────────────────────────────────────────────────────────

type WorkOrderRow = Tables<"shop_work_orders"> & {
  lines?: Tables<"shop_work_order_lines">[] | null;
};

function mapSettings(r: Tables<"shop_settings">): ShopSettings {
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

function mapInventory(r: Tables<"shop_inventory">): InventoryItem {
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

function mapWorkOrder(r: WorkOrderRow): WorkOrder {
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    description: r.description,
    status: r.status as WorkOrderStatus,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    boatLabel: r.boat_label,
    projectId: r.project_id,
    assignedTo: r.assigned_to,
    bay: r.bay,
    scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end,
    engineHours: r.engine_hours,
    taxRate: Number(r.tax_rate) || 0,
    completedAt: r.completed_at,
    exportedAt: r.exported_at,
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

function mapShipment(r: Tables<"shop_parts_shipments">): PartsShipment {
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

// ── Realtime ─────────────────────────────────────────────────────────────────

/** Keep inventory, shipments and work orders live across the shop's devices. */
export function useShopRealtime(vendorId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!vendorId || isDemoMode() || supabaseMissing) return;
    const filter = `vendor_id=eq.${vendorId}`;
    const channel = supabase
      .channel(`shop:${vendorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_inventory", filter }, () =>
        qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_parts_shipments", filter }, () =>
        qc.invalidateQueries({ queryKey: ["shop-shipments", vendorId] })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_work_orders", filter }, () =>
        qc.invalidateQueries({ queryKey: ["shop-work-orders", vendorId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, qc]);
}

function invalidateShop(qc: ReturnType<typeof useQueryClient>, vendorId: string) {
  qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] });
  qc.invalidateQueries({ queryKey: ["shop-work-orders", vendorId] });
  qc.invalidateQueries({ queryKey: ["shop-shipments", vendorId] });
  qc.invalidateQueries({ queryKey: ["shop-settings", vendorId] });
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function useShopSettings(vendorId: string | null) {
  return useQuery({
    queryKey: ["shop-settings", vendorId],
    queryFn: async (): Promise<ShopSettings> => {
      if (isDemoMode()) return loadDemo().settings;
      const client = db();
      const { data, error } = await client
        .from("shop_settings")
        .select("*")
        .eq("vendor_id", vendorId!)
        .maybeSingle();
      if (error) throw error;
      if (data) return mapSettings(data);
      const { data: created, error: insertError } = await client
        .from("shop_settings")
        .insert({ vendor_id: vendorId! })
        .select()
        .single();
      if (insertError) throw insertError;
      return mapSettings(created);
    },
    enabled: !!vendorId,
  });
}

export function useUpdateShopSettings(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ShopSettings, "inboundEmailToken">>) => {
      if (isDemoMode()) {
        mutateDemo((s) => {
          s.settings = { ...s.settings, ...patch };
        });
        return;
      }
      const { error } = await db()
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
        .eq("vendor_id", vendorId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-settings", vendorId] }),
  });
}

// ── Inventory ────────────────────────────────────────────────────────────────

export function useInventory(vendorId: string | null) {
  return useQuery({
    queryKey: ["shop-inventory", vendorId],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (isDemoMode()) return loadDemo().inventory;
      const { data, error } = await db()
        .from("shop_inventory")
        .select("*")
        .eq("vendor_id", vendorId!)
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapInventory);
    },
    enabled: !!vendorId,
  });
}

export type InventoryDraft = Omit<InventoryItem, "id" | "updatedAt"> & { id?: string };

export function useSaveInventoryItem(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: InventoryDraft) => {
      const now = new Date().toISOString();
      if (isDemoMode()) {
        mutateDemo((s) => {
          if (item.id) {
            s.inventory = s.inventory.map((i) => (i.id === item.id ? { ...i, ...item, id: i.id, updatedAt: now } : i));
          } else {
            s.inventory.push({ ...item, id: newId("inv"), updatedAt: now });
          }
        });
        return;
      }
      const row = {
        vendor_id: vendorId!,
        sku: item.sku,
        name: item.name,
        category: item.category,
        bin_location: item.binLocation,
        qty_on_hand: item.qtyOnHand,
        reorder_point: item.reorderPoint,
        unit_cost: item.unitCost,
        unit_price: item.unitPrice,
        supplier: item.supplier,
        updated_at: now,
      };
      const { error } = item.id
        ? await db().from("shop_inventory").update(row).eq("id", item.id)
        : await db().from("shop_inventory").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] }),
  });
}

export function useDeleteInventoryItem(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        mutateDemo((s) => {
          s.inventory = s.inventory.filter((i) => i.id !== id);
        });
        return;
      }
      const { error } = await db().from("shop_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] }),
  });
}

export function useAdjustInventory(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      if (isDemoMode()) {
        mutateDemo((s) => {
          s.inventory = s.inventory.map((i) =>
            i.id === id ? { ...i, qtyOnHand: i.qtyOnHand + delta, updatedAt: new Date().toISOString() } : i
          );
        });
        return;
      }
      const { error } = await db().rpc("shop_adjust_inventory", { item_id: id, delta });
      if (error) throw error;
    },
    onMutate: async ({ id, delta }) => {
      // Optimistic so counter taps feel instant.
      const key = ["shop-inventory", vendorId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InventoryItem[]>(key);
      qc.setQueryData<InventoryItem[]>(key, (items) =>
        items?.map((i) => (i.id === id ? { ...i, qtyOnHand: i.qtyOnHand + delta } : i))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["shop-inventory", vendorId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] }),
  });
}

// ── Work orders ──────────────────────────────────────────────────────────────

export function useWorkOrders(vendorId: string | null) {
  return useQuery({
    queryKey: ["shop-work-orders", vendorId],
    queryFn: async (): Promise<WorkOrder[]> => {
      if (isDemoMode()) return loadDemo().workOrders;
      const { data, error } = await db()
        .from("shop_work_orders")
        .select("*, lines:shop_work_order_lines(*)")
        .eq("vendor_id", vendorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as WorkOrderRow[]).map(mapWorkOrder);
    },
    enabled: !!vendorId,
  });
}

export function nextWorkOrderNumber(orders: WorkOrder[]): string {
  const max = orders.reduce((m, o) => {
    const n = Number(o.number.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return `WO-${max + 1}`;
}

export type WorkOrderDraft = Omit<WorkOrder, "id" | "createdAt" | "completedAt" | "exportedAt"> & {
  id?: string;
};

const DONE: WorkOrderStatus[] = ["completed", "invoiced"];

export function useSaveWorkOrder(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: WorkOrderDraft): Promise<string> => {
      const now = new Date().toISOString();
      if (isDemoMode()) {
        const id = draft.id ?? newId("wo");
        mutateDemo((s) => {
          const prev = s.workOrders.find((o) => o.id === draft.id);
          const delta = inventoryDelta(prev?.lines ?? [], draft.lines);
          s.inventory = s.inventory.map((i) =>
            delta[i.id] ? { ...i, qtyOnHand: i.qtyOnHand + delta[i.id], updatedAt: now } : i
          );
          const lines = draft.lines.map((l) => ({ ...l, id: l.id ?? newId("l") }));
          const completedAt = DONE.includes(draft.status) ? (prev?.completedAt ?? now) : null;
          if (prev) {
            s.workOrders = s.workOrders.map((o) =>
              o.id === prev.id ? { ...prev, ...draft, id: prev.id, lines, completedAt } : o
            );
          } else {
            s.workOrders.unshift({ ...draft, id, lines, createdAt: now, completedAt, exportedAt: null });
          }
          s.shipments = s.shipments.map((sh) => pairWithBoat(sh, s.workOrders));
        });
        return id;
      }

      const client = db();
      const header = {
        vendor_id: vendorId!,
        number: draft.number,
        project_id: draft.projectId ?? null,
        title: draft.title,
        description: draft.description,
        customer_name: draft.customerName,
        customer_email: draft.customerEmail,
        boat_label: draft.boatLabel,
        assigned_to: draft.assignedTo,
        bay: draft.bay,
        scheduled_start: draft.scheduledStart,
        scheduled_end: draft.scheduledEnd,
        engine_hours: draft.engineHours,
        tax_rate: draft.taxRate,
        updated_at: now,
      };

      // Lines are written before the status flips to completed so the
      // logbook trigger sees the full itemized job.
      let id = draft.id;
      if (id) {
        const { error } = await client.from("shop_work_orders").update(header).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await client
          .from("shop_work_orders")
          .insert({ ...header, status: DONE.includes(draft.status) ? "in-progress" : draft.status })
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
          }))
        );
        if (lineError) throw lineError;
      }

      await setStatusLive(id, draft.status);
      return id;
    },
    onSuccess: () => invalidateShop(qc, vendorId!),
  });
}

async function setStatusLive(id: string, status: WorkOrderStatus) {
  const client = db();
  const { data: current } = await client
    .from("shop_work_orders")
    .select("status, completed_at")
    .eq("id", id)
    .single();
  const patch: Partial<Tables<"shop_work_orders">> = { status, updated_at: new Date().toISOString() };
  if (DONE.includes(status) && !current?.completed_at) patch.completed_at = new Date().toISOString();
  if (!DONE.includes(status)) patch.completed_at = null;
  const { error } = await client.from("shop_work_orders").update(patch).eq("id", id);
  if (error) throw error;
}

export function useSetWorkOrderStatus(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkOrderStatus }) => {
      if (isDemoMode()) {
        const now = new Date().toISOString();
        mutateDemo((s) => {
          s.workOrders = s.workOrders.map((o) =>
            o.id === id
              ? { ...o, status, completedAt: DONE.includes(status) ? (o.completedAt ?? now) : null }
              : o
          );
        });
        return;
      }
      await setStatusLive(id, status);
    },
    onSuccess: () => invalidateShop(qc, vendorId!),
  });
}

export function useDeleteWorkOrder(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        mutateDemo((s) => {
          const prev = s.workOrders.find((o) => o.id === id);
          const delta = inventoryDelta(prev?.lines ?? [], []);
          s.inventory = s.inventory.map((i) => (delta[i.id] ? { ...i, qtyOnHand: i.qtyOnHand + delta[i.id] } : i));
          s.workOrders = s.workOrders.filter((o) => o.id !== id);
        });
        return;
      }
      // Delete lines first so the inventory trigger returns parts to the shelf.
      const client = db();
      const { error: lineError } = await client.from("shop_work_order_lines").delete().eq("work_order_id", id);
      if (lineError) throw lineError;
      const { error } = await client.from("shop_work_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateShop(qc, vendorId!),
  });
}

/** Stamp exported work orders and move completed ones to invoiced. */
export function useMarkExported(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString();
      if (isDemoMode()) {
        mutateDemo((s) => {
          s.workOrders = s.workOrders.map((o) =>
            ids.includes(o.id) ? { ...o, exportedAt: now, status: "invoiced" } : o
          );
        });
        return;
      }
      const { error } = await db()
        .from("shop_work_orders")
        .update({ exported_at: now, status: "invoiced", updated_at: now })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateShop(qc, vendorId!),
  });
}

// ── Inbound parts ────────────────────────────────────────────────────────────

export function useShipments(vendorId: string | null) {
  return useQuery({
    queryKey: ["shop-shipments", vendorId],
    queryFn: async (): Promise<PartsShipment[]> => {
      if (isDemoMode()) return loadDemo().shipments;
      const { data, error } = await db()
        .from("shop_parts_shipments")
        .select("*")
        .eq("vendor_id", vendorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapShipment);
    },
    enabled: !!vendorId,
  });
}

export type ShipmentDraft = Omit<PartsShipment, "id" | "createdAt" | "receivedAt"> & { id?: string };

/** Insert or merge by tracking number (so a re-pasted email just advances status). */
export function useSaveShipment(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ShipmentDraft) => {
      const now = new Date().toISOString();
      if (isDemoMode()) {
        mutateDemo((s) => {
          const existing = s.shipments.find(
            (x) => x.id === draft.id || (draft.trackingNumber && x.trackingNumber === draft.trackingNumber)
          );
          const paired = pairWithBoat(draft, s.workOrders);
          if (existing) {
            Object.assign(existing, {
              ...paired,
              id: existing.id,
              status: draft.id ? draft.status : advanceStatus(existing.status, draft.status),
              eta: draft.eta ?? existing.eta,
            });
          } else {
            s.shipments.unshift({ ...paired, id: newId("sh"), createdAt: now, receivedAt: null });
          }
        });
        return;
      }
      const client = db();
      const row = {
        vendor_id: vendorId!,
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
        updated_at: now,
      };
      let existingId = draft.id;
      let existingStatus: ShipmentStatus | null = null;
      if (!existingId && draft.trackingNumber) {
        const { data } = await client
          .from("shop_parts_shipments")
          .select("id, status")
          .eq("vendor_id", vendorId!)
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-shipments", vendorId] }),
  });
}

/** Check a shipment in: marks delivered and puts linked stock on the shelf. */
export function useReceiveShipment(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();
      if (isDemoMode()) {
        mutateDemo((s) => {
          const sh = s.shipments.find((x) => x.id === id);
          if (!sh || sh.receivedAt) return;
          sh.receivedAt = now;
          sh.status = "delivered";
          if (sh.inventoryItemId) {
            s.inventory = s.inventory.map((i) =>
              i.id === sh.inventoryItemId ? { ...i, qtyOnHand: i.qtyOnHand + sh.quantity, updatedAt: now } : i
            );
          }
        });
        return;
      }
      const { error } = await db()
        .from("shop_parts_shipments")
        .update({ received_at: now, status: "delivered", updated_at: now })
        .eq("id", id)
        .is("received_at", null);
      if (error) throw error;
    },
    onSuccess: () => invalidateShop(qc, vendorId!),
  });
}

export function useDeleteShipment(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        mutateDemo((s) => {
          s.shipments = s.shipments.filter((x) => x.id !== id);
        });
        return;
      }
      const { error } = await db().from("shop_parts_shipments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-shipments", vendorId] }),
  });
}

export type { WorkOrderLine };

// ── Crew logins ──────────────────────────────────────────────────────────────

export type CrewRole = "tech" | "manager";

export interface ShopMember {
  id: string;
  email: string;
  techName: string;
  role: CrewRole;
  joined: boolean;
}

function saveDemoCrew(crew: ShopMember[]) {
  try {
    localStorage.setItem(DEMO_CREW_KEY, JSON.stringify(crew));
  } catch {
    // ignore
  }
}

const DEMO_CREW_KEY = "bosun_demo_crew_v1";

function loadDemoCrew(): ShopMember[] {
  try {
    const raw = localStorage.getItem(DEMO_CREW_KEY);
    if (raw) return JSON.parse(raw) as ShopMember[];
  } catch {
    // seed
  }
  return [
    { id: "crew-1", email: "marco@example.com", techName: "Marco", role: "tech", joined: true },
    { id: "crew-2", email: "jess@example.com", techName: "Jess", role: "tech", joined: false },
    { id: "crew-3", email: "dana.service@example.com", techName: "Dana", role: "manager", joined: true },
  ];
}

export function useCrew(vendorId: string | null) {
  return useQuery({
    queryKey: ["shop-crew", vendorId],
    queryFn: async (): Promise<ShopMember[]> => {
      if (isDemoMode()) return loadDemoCrew();
      const { data, error } = await db()
        .from("shop_members")
        .select("*")
        .eq("vendor_id", vendorId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        email: m.email,
        techName: m.tech_name,
        role: (m.role === "manager" ? "manager" : "tech") as CrewRole,
        joined: !!m.user_id,
      }));
    },
    enabled: !!vendorId,
  });
}

export function useInviteCrew(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, techName, role = "tech" }: { email: string; techName: string; role?: CrewRole }) => {
      const clean = email.trim().toLowerCase();
      if (isDemoMode()) {
        const crew = loadDemoCrew().filter((m) => m.email !== clean);
        crew.push({ id: newId("crew"), email: clean, techName, role, joined: false });
        saveDemoCrew(crew);
        return;
      }
      const { error } = await db()
        .from("shop_members")
        .upsert({ vendor_id: vendorId!, email: clean, tech_name: techName, role }, { onConflict: "vendor_id,email" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-crew", vendorId] }),
  });
}

export function useRemoveCrew(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        saveDemoCrew(loadDemoCrew().filter((m) => m.id !== id));
        return;
      }
      const { error } = await db().from("shop_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-crew", vendorId] }),
  });
}

export function useSetCrewRole(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: CrewRole }) => {
      if (isDemoMode()) {
        saveDemoCrew(loadDemoCrew().map((m) => (m.id === id ? { ...m, role } : m)));
        return;
      }
      const { error } = await db().from("shop_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-crew", vendorId] }),
  });
}

/** Rename a crew member; their assigned jobs and board slot move with them. */
export function useRenameCrew(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member, newName }: { member: ShopMember; newName: string }) => {
      const name = newName.trim();
      if (!name || name === member.techName) return;
      if (isDemoMode()) {
        saveDemoCrew(loadDemoCrew().map((m) => (m.id === member.id ? { ...m, techName: name } : m)));
        mutateDemo((s) => {
          s.workOrders = s.workOrders.map((o) => (o.assignedTo === member.techName ? { ...o, assignedTo: name } : o));
          s.settings = { ...s.settings, techs: s.settings.techs.map((t) => (t === member.techName ? name : t)) };
        });
        return;
      }
      const { error } = await db().rpc("rename_crew_member", { member_id: member.id, new_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateShop(qc, vendorId!);
      qc.invalidateQueries({ queryKey: ["shop-crew", vendorId] });
    },
  });
}

// ── Tech view ────────────────────────────────────────────────────────────────

export interface CrewMembership {
  vendorId: string;
  shopName: string;
  techName: string;
  role: CrewRole;
}

/** Shops I'm on the crew of. Claims any invite sent to my email first. */
export function useMyCrewMemberships(userId: string | undefined, demoTech?: string) {
  return useQuery({
    queryKey: ["my-crew", isDemoMode() ? `demo-${demoTech}` : userId],
    queryFn: async (): Promise<CrewMembership[]> => {
      if (isDemoMode()) {
        const techs = loadDemo().settings.techs;
        const techName = demoTech ?? techs[0] ?? "Marco";
        const role = loadDemoCrew().find((m) => m.techName === techName)?.role ?? "tech";
        return [{ vendorId: "demo-shop", shopName: "Dean's Marine", techName, role }];
      }
      const client = db();
      await client.rpc("claim_shop_invites");
      const { data, error } = await client
        .from("shop_members")
        .select("vendor_id, tech_name, role, vendor:vendor_profiles(business_name)")
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data ?? []) as unknown as { vendor_id: string; tech_name: string; role: string; vendor: { business_name: string } | null }[]).map(
        (m) => ({
          vendorId: m.vendor_id,
          shopName: m.vendor?.business_name ?? "Your shop",
          techName: m.tech_name,
          role: (m.role === "manager" ? "manager" : "tech") as CrewRole,
        })
      );
    },
    enabled: isDemoMode() || !!userId,
  });
}

export function useTechJobs(m: CrewMembership | undefined) {
  return useQuery({
    queryKey: ["tech-jobs", m?.vendorId, m?.techName],
    queryFn: async (): Promise<WorkOrder[]> => {
      if (isDemoMode()) return loadDemo().workOrders.filter((o) => o.assignedTo === m!.techName);
      const { data, error } = await db()
        .from("shop_work_orders")
        .select("*, lines:shop_work_order_lines(*)")
        .eq("vendor_id", m!.vendorId)
        .eq("assigned_to", m!.techName)
        .order("scheduled_start", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as WorkOrderRow[]).map(mapWorkOrder);
    },
    enabled: !!m,
  });
}

export function useTechInventory(m: CrewMembership | undefined) {
  return useQuery({
    queryKey: ["tech-inventory", m?.vendorId],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (isDemoMode()) return loadDemo().inventory;
      const { data, error } = await db().from("shop_inventory").select("*").eq("vendor_id", m!.vendorId);
      if (error) throw error;
      return (data ?? []).map(mapInventory);
    },
    enabled: !!m,
  });
}

/** A tech moves their own job along and/or adds a note (notes show in the owner's Boat Log). */
export function useTechUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, status, note }: { order: WorkOrder; status?: WorkOrderStatus; note?: string }) => {
      const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const description = note?.trim()
        ? [order.description.trim(), `${stamp} (${order.assignedTo}): ${note.trim()}`].filter(Boolean).join("\n")
        : order.description;
      if (isDemoMode()) {
        const now = new Date().toISOString();
        mutateDemo((s) => {
          s.workOrders = s.workOrders.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  description,
                  status: status ?? o.status,
                  completedAt: status && DONE.includes(status) ? (o.completedAt ?? now) : o.completedAt,
                }
              : o
          );
        });
        return;
      }
      const patch: Partial<Tables<"shop_work_orders">> = { description, updated_at: new Date().toISOString() };
      if (status) {
        patch.status = status;
        if (DONE.includes(status) && !order.completedAt) patch.completed_at = new Date().toISOString();
      }
      const { error } = await db().from("shop_work_orders").update(patch).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tech-jobs"] });
      qc.invalidateQueries({ queryKey: ["shop-work-orders"] });
    },
  });
}
