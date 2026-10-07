// React Query hooks over the shared data functions. Query keys match the web's where they overlap.
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OPEN_RFP_SELECT, PROJECT_DETAIL_SELECT, PROJECT_LIST_SELECT, mapProject, type ProjectRow } from "@bosun/shared/marketplace/map";
import { createProject, type CreateProjectInput } from "@bosun/shared/marketplace/jobs";
import { acceptBid, markBidsSeen, setBidRejected, submitBid, updateProjectStatus, withdrawBid, type SubmitBidInput } from "@bosun/shared/marketplace/bids";
import { listBidMessages, listNotifications, markMessagesRead, markNotificationsRead, sendMessage } from "@bosun/shared/marketplace/messages";
import { getMyVendorProfile, updateMyVendorProfile } from "@bosun/shared/vendors/profile";
import { inviteCrew, listCrew, removeCrew, renameCrew, setCrewRole, type CrewRole, type ShopMember } from "@bosun/shared/shop/crew";
import type { Project, ProjectStatus } from "@bosun/shared/marketplace/types";
import type { InsertTables, UpdateTables } from "@bosun/shared/database.types";
import { api } from "./api";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const rows = (data: unknown) => ((data ?? []) as ProjectRow[]).map(mapProject);

export function useOwnerProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marketplace-projects", "owner", user?.id],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from("projects").select(PROJECT_LIST_SELECT).eq("owner_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return rows(data);
    },
    enabled: !!user,
  });
}

export function useOpenRfps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marketplace-projects", "open-rfps"],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from("projects").select(OPEN_RFP_SELECT).in("status", ["active", "bidding", "gathering"]).order("created_at", { ascending: false });
      if (error) throw error;
      return rows(data);
    },
    enabled: !!user,
  });
}

export function useVendorBidProjects(vendorProfileId: string | null | undefined) {
  return useQuery({
    queryKey: ["marketplace-projects", "vendor-bids", vendorProfileId],
    queryFn: async (): Promise<Project[]> => {
      const { data: bids, error: bidError } = await supabase.from("bids").select("project_id").eq("vendor_id", vendorProfileId!);
      if (bidError) throw bidError;
      const ids = [...new Set((bids ?? []).map((b) => b.project_id))];
      if (!ids.length) return [];
      const { data, error } = await supabase.from("projects").select(PROJECT_LIST_SELECT).in("id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      return rows(data);
    },
    enabled: !!vendorProfileId,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-project", id],
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase.from("projects").select(PROJECT_DETAIL_SELECT).eq("id", id!).single();
      if (error) throw error;
      return mapProject(data as unknown as ProjectRow);
    },
    enabled: !!id,
  });
}

function invalidateMarketplace(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
  qc.invalidateQueries({ queryKey: ["marketplace-project"] });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(supabase, api, user!.id, input),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useSubmitBid() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: SubmitBidInput) => submitBid(supabase, input), onSuccess: () => invalidateMarketplace(qc) });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { projectId: string; bidId: string; booking?: Record<string, unknown> }) => acceptBid(supabase, v.projectId, v.bidId, v.booking),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useSetBidRejected() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { bidId: string; rejected: boolean }) => setBidRejected(supabase, v.bidId, v.rejected), onSuccess: () => invalidateMarketplace(qc) });
}

export function useWithdrawBid() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (bidId: string) => withdrawBid(supabase, bidId), onSuccess: () => invalidateMarketplace(qc) });
}

export function useMarkBidsSeen() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (projectId: string) => markBidsSeen(supabase, projectId), onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-projects"] }) });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { projectId: string; status: ProjectStatus }) => updateProjectStatus(supabase, v.projectId, v.status), onSuccess: () => invalidateMarketplace(qc) });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function useBidMessages(bidId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["messages", bidId], queryFn: () => listBidMessages(supabase, bidId!), enabled: !!bidId });
  useEffect(() => {
    if (!bidId) return;
    const channel = supabase
      .channel(`messages:${bidId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `bid_id=eq.${bidId}` }, () => qc.invalidateQueries({ queryKey: ["messages", bidId] }))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bidId, qc]);
  return query;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (msg: Omit<InsertTables<"messages">, "sender_id">) => sendMessage(supabase, user!.id, msg),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.bid_id] });
      qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
    },
  });
}

export function useMarkMessagesRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (bidId: string) => markMessagesRead(supabase, user!.id, bidId),
    onSuccess: (_d, bidId) => {
      qc.invalidateQueries({ queryKey: ["messages", bidId] });
      qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
    },
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["notifications", user?.id], queryFn: () => listNotifications(supabase, user!.id), enabled: !!user });
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
  return query;
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({ mutationFn: (id?: string) => markNotificationsRead(supabase, user!.id, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
}

// ── Shop ──────────────────────────────────────────────────────────────────────

export function useMyVendorProfile() {
  const { user, profile } = useAuth();
  return useQuery({ queryKey: ["my-vendor-profile", user?.id], queryFn: () => getMyVendorProfile(supabase, user!.id), enabled: !!user && profile?.role === "vendor" });
}

export function useUpdateMyVendorProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (patch: UpdateTables<"vendor_profiles">) => updateMyVendorProfile(supabase, user!.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-vendor-profile"] }),
  });
}

export function useCrew(vendorId: string | null | undefined) {
  return useQuery({ queryKey: ["shop-crew", vendorId], queryFn: (): Promise<ShopMember[]> => listCrew(supabase, vendorId!), enabled: !!vendorId });
}

export function useCrewActions(vendorId: string | null | undefined) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["shop-crew", vendorId] });
  return {
    invite: useMutation({ mutationFn: (v: { email: string; techName: string; role?: CrewRole }) => inviteCrew(supabase, vendorId!, v), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => removeCrew(supabase, id), onSuccess: done }),
    setRole: useMutation({ mutationFn: (v: { id: string; role: CrewRole }) => setCrewRole(supabase, v.id, v.role), onSuccess: done }),
    rename: useMutation({ mutationFn: (v: { member: ShopMember; newName: string }) => renameCrew(supabase, v.member, v.newName), onSuccess: done }),
  };
}
