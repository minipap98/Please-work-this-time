import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import {
  PROJECT_DETAIL_SELECT,
  PROJECT_LIST_SELECT,
  acceptMarketplaceBid,
  createMarketplaceProject,
  mapProject,
  submitMarketplaceBid,
  updateProjectStatus,
  type CreateProjectInput,
  type ProjectRow,
  type SubmitBidInput,
} from "@/lib/marketplace";
import type { Project } from "@/data/projectData";

function assertClient() {
  if (supabaseMissing || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export function useOwnerMarketplaceProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marketplace-projects", "owner", user?.id],
    queryFn: async (): Promise<Project[]> => {
      const client = assertClient();
      const { data, error } = await client
        .from("projects")
        .select(PROJECT_LIST_SELECT)
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ProjectRow[]).map(mapProject);
    },
    enabled: !!user && !supabaseMissing,
  });
}

export function useOpenRfps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marketplace-projects", "open-rfps"],
    queryFn: async (): Promise<Project[]> => {
      const client = assertClient();
      const { data, error } = await client
        .from("projects")
        .select(PROJECT_LIST_SELECT)
        .in("status", ["active", "bidding", "gathering"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ProjectRow[]).map(mapProject);
    },
    enabled: !!user && !supabaseMissing,
  });
}

export function useVendorBidProjects(vendorProfileId: string | null) {
  return useQuery({
    queryKey: ["marketplace-projects", "vendor-bids", vendorProfileId],
    queryFn: async (): Promise<Project[]> => {
      const client = assertClient();
      const { data: bidRows, error: bidError } = await client
        .from("bids")
        .select("project_id")
        .eq("vendor_id", vendorProfileId!);
      if (bidError) throw bidError;
      const ids = [...new Set((bidRows ?? []).map((b) => b.project_id).filter(Boolean))];
      if (ids.length === 0) return [];
      const { data, error } = await client
        .from("projects")
        .select(PROJECT_LIST_SELECT)
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ProjectRow[]).map(mapProject);
    },
    enabled: !!vendorProfileId && !supabaseMissing,
  });
}

export function useMarketplaceProject(id: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-project", id],
    queryFn: async (): Promise<Project> => {
      const client = assertClient();
      const { data, error } = await client
        .from("projects")
        .select(PROJECT_DETAIL_SELECT)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return mapProject(data as unknown as ProjectRow);
    },
    enabled: !!id && !supabaseMissing,
  });
}

export function useCreateMarketplaceProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => {
      if (!user) throw new Error("You must be signed in to post a job.");
      return createMarketplaceProject(user.id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSubmitMarketplaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitBidInput) => submitMarketplaceBid(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
      qc.invalidateQueries({ queryKey: ["marketplace-project"] });
      qc.invalidateQueries({ queryKey: ["bids"] });
    },
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: Project["status"] }) =>
      updateProjectStatus(projectId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
      qc.invalidateQueries({ queryKey: ["marketplace-project"] });
    },
  });
}

export function useAcceptMarketplaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      bidId,
      booking,
    }: {
      projectId: string;
      bidId: string;
      booking?: Record<string, unknown>;
    }) => acceptMarketplaceBid(projectId, bidId, booking),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
      qc.invalidateQueries({ queryKey: ["marketplace-project"] });
    },
  });
}

export function useAdminMarketplace() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["admin-marketplace"],
    queryFn: async () => {
      const client = assertClient();
      const [profiles, projects] = await Promise.all([
        client.from("profiles").select("id, name, email, role, created_at, onboarding_complete, is_admin"),
        client.from("projects").select(PROJECT_LIST_SELECT).order("created_at", { ascending: false }),
      ]);
      if (profiles.error) throw profiles.error;
      if (projects.error) throw projects.error;
      return {
        profiles: profiles.data ?? [],
        projects: ((projects.data ?? []) as unknown as ProjectRow[]).map(mapProject),
      };
    },
    enabled: !!profile?.is_admin && !supabaseMissing,
  });
}
