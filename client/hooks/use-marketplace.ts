import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import {
  PROJECT_DETAIL_SELECT,
  PROJECT_LIST_SELECT,
  OPEN_RFP_SELECT,
  acceptMarketplaceBid,
  createMarketplaceProject,
  mapProject,
  submitMarketplaceBid,
  updateProjectStatus,
  type CreateProjectInput,
  type ProjectRow,
  type SubmitBidInput,
  formatProjectDate,
} from "@/lib/marketplace";
import type { Project, ProjectBoat } from "@/data/projectData";
import {
  cancelProject,
  getAugmentedProjects,
  getVendorBidProjects,
  reinstateProject,
  saveLocalProject,
  submitBid,
} from "@/data/bidUtils";
import { runAutoBidMatching, seedDemoTemplates } from "@/data/autoBidTemplates";
import { VENDOR_PROFILES } from "@/data/vendorData";

function assertClient() {
  if (supabaseMissing || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

function demoProjects(): Project[] {
  return getAugmentedProjects();
}

export function useOwnerMarketplaceProjects() {
  const { user } = useAuth();
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["marketplace-projects", demo ? "demo" : "owner", user?.id],
    queryFn: async (): Promise<Project[]> => {
      if (isDemoMode()) return demoProjects();
      const client = assertClient();
      const { data, error } = await client
        .from("projects")
        .select(PROJECT_LIST_SELECT)
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ProjectRow[]).map(mapProject);
    },
    enabled: demo || (!!user && !supabaseMissing),
  });
}

export function useOpenRfps() {
  const { user } = useAuth();
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["marketplace-projects", demo ? "demo-open-rfps" : "open-rfps"],
    queryFn: async (): Promise<Project[]> => {
      if (isDemoMode()) {
        return demoProjects().filter(
          (p) => p.status === "active" || p.status === "bidding" || p.status === "gathering"
        );
      }
      const client = assertClient();
      const { data, error } = await client
        .from("projects")
        .select(OPEN_RFP_SELECT)
        .in("status", ["active", "bidding", "gathering"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ProjectRow[]).map(mapProject);
    },
    enabled: demo || (!!user && !supabaseMissing),
  });
}

export function useVendorBidProjects(vendorProfileId: string | null) {
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["marketplace-projects", demo ? "demo-vendor-bids" : "vendor-bids", vendorProfileId],
    queryFn: async (): Promise<Project[]> => {
      if (isDemoMode()) {
        if (!vendorProfileId) return [];
        const rows = getVendorBidProjects(vendorProfileId);
        const byId = new Map<string, Project>();
        for (const { project } of rows) byId.set(project.id, project);
        return [...byId.values()];
      }
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
    enabled: !!vendorProfileId && (demo || !supabaseMissing),
  });
}

export function useMarketplaceProject(id: string | undefined) {
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["marketplace-project", demo ? "demo" : "live", id],
    queryFn: async (): Promise<Project> => {
      if (isDemoMode()) {
        const project = demoProjects().find((p) => p.id === id);
        if (!project) throw new Error("Project not found.");
        return project;
      }
      const client = assertClient();
      const { data, error } = await client
        .from("projects")
        .select(PROJECT_DETAIL_SELECT)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return mapProject(data as unknown as ProjectRow);
    },
    enabled: !!id && (demo || !supabaseMissing),
  });
}

export function useCreateMarketplaceProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => {
      if (isDemoMode()) {
        const dateStr = new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const meta = input.metadata ?? {};
        const boat = (meta.boat as ProjectBoat | undefined) ?? undefined;
        const newProject: Project = {
          id: `local_${Date.now()}`,
          title: input.title,
          description: input.description,
          status: "bidding",
          date: dateStr,
          location: input.location,
          category: input.category,
          boat,
          bids: [],
          photos: input.photos?.length ? input.photos : undefined,
          linkedEquipmentId: (meta.linkedEquipmentId as string | undefined) ?? undefined,
          isWarrantyClaim: Boolean(meta.isWarrantyClaim),
          workLocation: (meta.workLocation as Project["workLocation"]) || undefined,
          haulOutRequired: Boolean(meta.haulOutRequired) || undefined,
          haulOutArrangedBy: (meta.haulOutArrangedBy as Project["haulOutArrangedBy"]) || undefined,
          marinaCOIRequired: Boolean(meta.marinaCOIRequired) || undefined,
          linkedEquipment: (meta.linkedEquipment as Project["linkedEquipment"]) || undefined,
        };
        saveLocalProject(newProject);
        seedDemoTemplates();
        runAutoBidMatching(newProject);
        return Promise.resolve(newProject);
      }
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
    mutationFn: (input: SubmitBidInput) => {
      if (isDemoMode()) {
        const vendor = VENDOR_PROFILES[input.vendorProfileId];
        const now = new Date();
        submitBid(input.projectId, {
          id: `local_bid_${Date.now()}`,
          vendorProfileId: input.vendorProfileId,
          vendorName: vendor?.name ?? input.vendorProfileId,
          vendorInitials: vendor?.initials ?? "V",
          rating: vendor?.rating ?? 5,
          reviewCount: vendor?.reviewCount ?? 0,
          message: input.message,
          price: input.price,
          lineItems: input.lineItems,
          submittedDate: now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          expiryDate: input.expiryDate ? formatProjectDate(input.expiryDate) : "",
          thread: [],
        });
        return Promise.resolve();
      }
      return submitMarketplaceBid(input);
    },
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
    mutationFn: ({ projectId, status }: { projectId: string; status: Project["status"] }) => {
      if (isDemoMode()) {
        if (status === "expired") cancelProject(projectId);
        else if (status === "bidding") reinstateProject(projectId);
        else localStorage.setItem(`project_status_${projectId}`, status);
        return Promise.resolve();
      }
      return updateProjectStatus(projectId, status);
    },
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
    }) => {
      if (isDemoMode()) {
        localStorage.setItem(`booking_${projectId}`, JSON.stringify(booking ?? { bidId }));
        localStorage.setItem(`project_status_${projectId}`, "in-progress");
        return Promise.resolve();
      }
      return acceptMarketplaceBid(projectId, bidId, booking);
    },
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
