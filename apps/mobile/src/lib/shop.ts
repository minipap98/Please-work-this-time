// Shop OS on the phone: React Query hooks over the shared data functions, plus the one question
// every shop screen asks first: which shop am I working in? (my own, or one I manage as crew).
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MarketInput } from "@bosun/shared/insights";
import type { InventoryItem, PartsShipment, ShopBoat, ShopCustomer, WorkOrder, WorkOrderStatus } from "@bosun/shared/shop";
import { myCrewMemberships, type CrewMembership } from "@bosun/shared/shop/crew";
import {
  adjustInventory,
  billWorkOrder,
  deleteCustomer,
  deleteInventoryItem,
  deleteShipment,
  deleteShopBoat,
  deleteWorkOrder,
  getMarketInsights,
  getShopSettings,
  listCustomers,
  listInventory,
  listShipments,
  listShopBoats,
  listTechJobs,
  listWorkOrders,
  receiveShipment,
  saveCustomer,
  saveInventoryItem,
  saveShipment,
  saveWorkOrder,
  setWorkOrderStatus,
  techUpdateJob,
  updateShopSettings,
  type BillingAction,
  type BoatDraft,
  type CustomerDraft,
  type InventoryDraft,
} from "@bosun/shared/shop/data";
import type { ShipmentDraft, WorkOrderDraft } from "@bosun/shared/shop/drafts";
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from "@bosun/shared/shop/settings";
import { useAuth } from "./auth";
import { useMyVendorProfile } from "./queries";
import { supabase } from "./supabase";

export type { BillingAction, BoatDraft, CustomerDraft, InventoryDraft, ShipmentDraft, WorkOrderDraft, CrewMembership };

// ── Which shop ────────────────────────────────────────────────────────────────

/** Shops I'm on the crew of (claims any invite sent to my email first). */
export function useMyCrewMemberships() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["my-crew", user?.id], queryFn: () => myCrewMemberships(supabase, user!.id), enabled: !!user, staleTime: 60_000 });
}

export interface ShopContext {
  vendorId: string | null;
  shopName: string;
  /** True for a crew manager: whole board, but no settings, QuickBooks or crew changes. */
  managerMode: boolean;
  isLoading: boolean;
}

/** My own shop when I'm a vendor; otherwise the first shop I manage as crew. */
export function useShop(): ShopContext {
  const { profile } = useAuth();
  const own = useMyVendorProfile();
  const memberships = useMyCrewMemberships();
  if (profile?.role === "vendor") {
    return { vendorId: own.data?.id ?? null, shopName: own.data?.business_name ?? "Your shop", managerMode: false, isLoading: own.isLoading };
  }
  const managed = (memberships.data ?? []).find((m) => m.role === "manager");
  return { vendorId: managed?.vendorId ?? null, shopName: managed?.shopName ?? "", managerMode: true, isLoading: memberships.isLoading };
}

// ── Realtime ──────────────────────────────────────────────────────────────────

/** Keep the board, stock, parts and customers live across the shop's devices. */
export function useShopRealtime(vendorId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!vendorId) return;
    const filter = `vendor_id=eq.${vendorId}`;
    const tables: [string, string][] = [
      ["shop_inventory", "shop-inventory"],
      ["shop_parts_shipments", "shop-shipments"],
      ["shop_customers", "shop-customers"],
      ["shop_boats", "shop-boats"],
      ["shop_work_orders", "shop-work-orders"],
    ];
    let channel = supabase.channel(`shop:${vendorId}`);
    for (const [table, key] of tables) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter }, () => qc.invalidateQueries({ queryKey: [key, vendorId] }));
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, qc]);
}

function invalidateShop(qc: ReturnType<typeof useQueryClient>, vendorId: string | null) {
  for (const key of ["shop-inventory", "shop-work-orders", "shop-shipments", "shop-settings", "shop-customers", "shop-boats"]) {
    qc.invalidateQueries({ queryKey: [key, vendorId] });
  }
  qc.invalidateQueries({ queryKey: ["tech-jobs"] });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useShopSettings(vendorId: string | null) {
  return useQuery({ queryKey: ["shop-settings", vendorId], queryFn: (): Promise<ShopSettings> => getShopSettings(supabase, vendorId!), enabled: !!vendorId });
}

/** Settings, with the defaults standing in until they load. */
export function useShopSettingsOrDefault(vendorId: string | null): ShopSettings {
  return useShopSettings(vendorId).data ?? DEFAULT_SHOP_SETTINGS;
}

export function useUpdateShopSettings(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<ShopSettings, "inboundEmailToken">>) => updateShopSettings(supabase, vendorId!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-settings", vendorId] }),
  });
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function useInventory(vendorId: string | null) {
  return useQuery({ queryKey: ["shop-inventory", vendorId], queryFn: (): Promise<InventoryItem[]> => listInventory(supabase, vendorId!), enabled: !!vendorId });
}

export function useSaveInventoryItem(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (item: InventoryDraft) => saveInventoryItem(supabase, vendorId!, item), onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] }) });
}

export function useDeleteInventoryItem(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteInventoryItem(supabase, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-inventory", vendorId] }) });
}

/** Optimistic so the +/- taps feel instant. */
export function useAdjustInventory(vendorId: string | null) {
  const qc = useQueryClient();
  const key = ["shop-inventory", vendorId];
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => adjustInventory(supabase, id, delta),
    onMutate: async ({ id, delta }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InventoryItem[]>(key);
      qc.setQueryData<InventoryItem[]>(key, (items) => items?.map((i) => (i.id === id ? { ...i, qtyOnHand: i.qtyOnHand + delta } : i)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// ── Work orders ───────────────────────────────────────────────────────────────

export function useWorkOrders(vendorId: string | null) {
  return useQuery({ queryKey: ["shop-work-orders", vendorId], queryFn: (): Promise<WorkOrder[]> => listWorkOrders(supabase, vendorId!), enabled: !!vendorId });
}

export function useSaveWorkOrder(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (draft: WorkOrderDraft) => saveWorkOrder(supabase, vendorId!, draft), onSuccess: () => invalidateShop(qc, vendorId) });
}

export function useSetWorkOrderStatus(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; status: WorkOrderStatus }) => setWorkOrderStatus(supabase, v.id, v.status), onSuccess: () => invalidateShop(qc, vendorId) });
}

export function useDeleteWorkOrder(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteWorkOrder(supabase, id), onSuccess: () => invalidateShop(qc, vendorId) });
}

export function useBillWorkOrder(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (a: BillingAction) => billWorkOrder(supabase, a), onSuccess: () => invalidateShop(qc, vendorId) });
}

// ── Inbound parts ─────────────────────────────────────────────────────────────

export function useShipments(vendorId: string | null) {
  return useQuery({ queryKey: ["shop-shipments", vendorId], queryFn: (): Promise<PartsShipment[]> => listShipments(supabase, vendorId!), enabled: !!vendorId });
}

export function useSaveShipment(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (draft: ShipmentDraft) => saveShipment(supabase, vendorId!, draft), onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-shipments", vendorId] }) });
}

export function useReceiveShipment(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => receiveShipment(supabase, id), onSuccess: () => invalidateShop(qc, vendorId) });
}

export function useDeleteShipment(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteShipment(supabase, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-shipments", vendorId] }) });
}

// ── Customers and boats on file ───────────────────────────────────────────────

export function useCustomers(vendorId: string | null) {
  return useQuery({ queryKey: ["shop-customers", vendorId], queryFn: (): Promise<ShopCustomer[]> => listCustomers(supabase, vendorId!), enabled: !!vendorId });
}

export function useShopBoats(vendorId: string | null) {
  return useQuery({ queryKey: ["shop-boats", vendorId], queryFn: (): Promise<ShopBoat[]> => listShopBoats(supabase, vendorId!), enabled: !!vendorId });
}

export function useSaveCustomer(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: { customer: CustomerDraft; boats?: BoatDraft[] }) => saveCustomer(supabase, vendorId!, input), onSuccess: () => invalidateShop(qc, vendorId) });
}

export function useDeleteShopBoat(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteShopBoat(supabase, id), onSuccess: () => invalidateShop(qc, vendorId) });
}

export function useDeleteCustomer(vendorId: string | null) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteCustomer(supabase, id), onSuccess: () => invalidateShop(qc, vendorId) });
}

// ── Tech view ─────────────────────────────────────────────────────────────────

export function useTechJobs(m: CrewMembership | undefined) {
  return useQuery({ queryKey: ["tech-jobs", m?.vendorId, m?.techName], queryFn: (): Promise<WorkOrder[]> => listTechJobs(supabase, m!), enabled: !!m });
}

export function useTechUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { order: WorkOrder; status?: WorkOrderStatus; note?: string }) => techUpdateJob(supabase, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tech-jobs"] });
      qc.invalidateQueries({ queryKey: ["shop-work-orders"] });
    },
  });
}

// ── Insights ──────────────────────────────────────────────────────────────────

export function useMarketInsights(vendorId: string | null) {
  return useQuery({ queryKey: ["vendor-market-insights", vendorId], queryFn: (): Promise<MarketInput | null> => getMarketInsights(supabase), enabled: !!vendorId });
}
