import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Database, InsertTables, UpdateTables } from "@/lib/database.types";
import { listBidMessages, listNotifications, markMessagesRead, markNotificationsRead, sendMessage } from "@shared/marketplace/messages";
import { getMyVendorProfile, getVendorProfile, listVendorProfiles, updateMyVendorProfile } from "@shared/vendors/profile";
import { createBoat, deleteBoat, listBoats, updateBoat } from "@shared/boats/boats";

// ============================================================
// BOATS
// ============================================================
export function useBoats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boats", user?.id],
    queryFn: () => listBoats(supabase, user!.id),
    enabled: !!user,
  });
}

export function useCreateBoat() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (boat: Omit<InsertTables<"boats">, "owner_id">) => createBoat(supabase, user!.id, boat),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boats"] }),
  });
}

export function useUpdateBoat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateTables<"boats"> & { id: string }) => updateBoat(supabase, id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boats"] }),
  });
}

export function useDeleteBoat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBoat(supabase, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boats"] }),
  });
}

// ============================================================
// BOAT DOCUMENTS
// ============================================================
export function useBoatDocuments(boatId: string | undefined) {
  return useQuery({
    queryKey: ["boat-documents", boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boat_documents")
        .select("*")
        .eq("boat_id", boatId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boatId,
  });
}

export function useUploadBoatDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      boatId,
      file,
      documentType,
      title,
      expiryDate,
      notes,
    }: {
      boatId: string;
      file: File;
      documentType: InsertTables<"boat_documents">["document_type"];
      title: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      // Upload file to storage
      const path = `${user!.id}/${boatId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("boat-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("boat-documents")
        .getPublicUrl(path);

      // Insert record
      const { data, error } = await supabase
        .from("boat_documents")
        .insert({
          boat_id: boatId,
          owner_id: user!.id,
          document_type: documentType,
          title,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          expiry_date: expiryDate,
          notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boat-documents"] }),
  });
}

// ============================================================
// PROJECTS
// ============================================================
export function useProjects(status?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects", user?.id, status],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select(`
          *,
          boat:boats(*),
          photos:project_photos(*)
        `)
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status as any);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          boat:boats(*),
          photos:project_photos(*),
          bids:bids!bids_project_id_fkey(
            *,
            line_items:bid_line_items(*),
            vendor:vendor_profiles(*)
          )
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (project: Omit<InsertTables<"projects">, "owner_id">) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateTables<"projects"> & { id: string }) => {
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

// ============================================================
// BIDS
// ============================================================
export function useProjectBids(projectId: string | undefined) {
  return useQuery({
    queryKey: ["bids", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select(`
          *,
          line_items:bid_line_items(*),
          vendor:vendor_profiles(*)
        `)
        .eq("project_id", projectId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineItems,
      ...bid
    }: InsertTables<"bids"> & { lineItems?: Omit<InsertTables<"bid_line_items">, "bid_id">[] }) => {
      const { data, error } = await supabase
        .from("bids")
        .insert(bid)
        .select()
        .single();
      if (error) throw error;

      if (lineItems?.length) {
        const { error: liError } = await supabase
          .from("bid_line_items")
          .insert(lineItems.map((li) => ({ ...li, bid_id: (data as any).id })));
        if (liError) throw liError;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bidId, projectId }: { bidId: string; projectId: string }) => {
      // Mark bid as accepted
      await supabase.from("bids").update({ accepted: true }).eq("id", bidId);
      // Set chosen_bid_id on project and update status
      await supabase
        .from("projects")
        .update({ chosen_bid_id: bidId, status: "in-progress" })
        .eq("id", projectId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

// ============================================================
// VENDOR PROFILES
// ============================================================
export function useVendorProfiles() {
  return useQuery({
    queryKey: ["vendor-profiles"],
    queryFn: () => listVendorProfiles(supabase),
  });
}

export function useVendorProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor-profile", id],
    queryFn: () => getVendorProfile(supabase, id!),
    enabled: !!id,
  });
}

export function useMyVendorProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-vendor-profile", user?.id],
    queryFn: () => getMyVendorProfile(supabase, user!.id),
    enabled: !!user,
  });
}

// ============================================================
// MESSAGES (real-time)
// ============================================================
export function useBidMessages(bidId: string | undefined) {
  const qc = useQueryClient();

  // Subscribe to realtime
  const query = useQuery({
    queryKey: ["messages", bidId],
    queryFn: () => listBidMessages(supabase, bidId!),
    enabled: !!bidId,
  });

  // Realtime subscription for new messages
  useRealtimeMessages(bidId, () => {
    qc.invalidateQueries({ queryKey: ["messages", bidId] });
  });

  return query;
}

function useRealtimeMessages(bidId: string | undefined, onMessage: () => void) {
  // useEffect imported at top
  useEffect(() => {
    if (!bidId) return;
    const channel = supabase
      .channel(`messages:${bidId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `bid_id=eq.${bidId}` },
        () => onMessage()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bidId, onMessage]);
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (msg: Omit<InsertTables<"messages">, "sender_id">) => sendMessage(supabase, user!.id, msg),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.bid_id] });
    },
  });
}

// ============================================================
// INBOX THREADS (conversations grouped by bid)
// ============================================================

/**
 * Fetches all message threads for the current user.
 * Groups messages by bid_id, joining with bid/project/vendor data.
 * Subscribes to realtime inserts so new threads appear instantly.
 */
export function useInboxThreads() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["inbox-threads", user?.id],
    queryFn: async () => {
      // Get all messages where user is sender or recipient
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by bid_id to find unique threads
      const bidMap = new Map<string, typeof messages>();
      for (const msg of messages ?? []) {
        const key = (msg as any).bid_id ?? "direct";
        if (!bidMap.has(key)) bidMap.set(key, []);
        bidMap.get(key)!.push(msg);
      }

      // Get bid details for each thread
      const bidIds = [...bidMap.keys()].filter((k) => k !== "direct");
      let bidsData: any[] = [];
      if (bidIds.length > 0) {
        const { data } = await supabase
          .from("bids")
          .select(`
            *,
            vendor:vendor_profiles(*),
            project:projects!bids_project_id_fkey(
              *,
              boat:boats(*)
            )
          `)
          .in("id", bidIds);
        bidsData = data ?? [];
      }

      // Build thread list
      const threads = bidIds.map((bidId) => {
        const msgs = bidMap.get(bidId)! as any[];
        const bid = bidsData.find((b: any) => b.id === bidId);
        const lastMessage = msgs[0]; // already sorted desc
        const unreadCount = msgs.filter(
          (m: any) => m.recipient_id === user!.id && m.status !== "read"
        ).length;
        // Determine the "other" participant
        const otherUserId = lastMessage.sender_id === user!.id
          ? lastMessage.recipient_id
          : lastMessage.sender_id;

        return {
          bidId,
          bid,
          project: bid?.project ?? null,
          vendor: bid?.vendor ?? null,
          boat: bid?.project?.boat ?? null,
          lastMessage,
          unreadCount,
          otherUserId,
          messageCount: msgs.length,
        };
      });

      // Sort by most recent message
      threads.sort(
        (a: any, b: any) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
      );

      return threads;
    },
    enabled: !!user,
  });

  // Realtime: refresh inbox when any message is inserted for this user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id || msg.recipient_id === user.id) {
            qc.invalidateQueries({ queryKey: ["inbox-threads", user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return query;
}

/**
 * Marks all unread messages in a bid thread as "read" for the current user.
 */
export function useMarkMessagesRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (bidId: string) => markMessagesRead(supabase, user!.id, bidId),
    onSuccess: (_, bidId) => {
      qc.invalidateQueries({ queryKey: ["messages", bidId] });
      qc.invalidateQueries({ queryKey: ["inbox-threads"] });
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id?: string) => markNotificationsRead(supabase, user!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useUpdateMyVendorProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (patch: UpdateTables<"vendor_profiles">) => updateMyVendorProfile(supabase, user!.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-vendor-profile"] });
      qc.invalidateQueries({ queryKey: ["vendor-profiles"] });
      qc.invalidateQueries({ queryKey: ["vendor-profile"] });
    },
  });
}

// ============================================================
// REVIEWS
// ============================================================
export function useVendorReviews(vendorId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("vendor_id", vendorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Profiles are private; reviewer names come from the public name cards.
      const ids = [...new Set((data ?? []).map((r) => r.reviewer_id).filter(Boolean))];
      const { data: cards } = ids.length
        ? await supabase.rpc("profile_cards", { ids })
        : { data: [] as Database["public"]["Functions"]["profile_cards"]["Returns"] };
      const byId = new Map((cards ?? []).map((c) => [c.id, c]));
      return (data ?? []).map((r) => ({ ...r, reviewer: byId.get(r.reviewer_id) ?? null }));
    },
    enabled: !!vendorId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (review: Omit<InsertTables<"reviews">, "reviewer_id">) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert({ ...review, reviewer_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["vendor-profiles"] });
    },
  });
}

// ============================================================
// INVOICES & PAYMENTS
// ============================================================
export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)")
        .eq("id", invoiceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useProjectInvoices(projectId: string | undefined) {
  return useQuery({
    queryKey: ["invoices", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)")
        .eq("project_id", projectId!)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// ============================================================
// NOTIFICATIONS (real-time)
// ============================================================
export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => listNotifications(supabase, user!.id),
    enabled: !!user,
  });

  // Realtime subscription
  // useEffect imported at top
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return query;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ============================================================
// MAINTENANCE
// ============================================================
export function useMaintenanceTasks(engineMake?: string, engineModel?: string) {
  return useQuery({
    queryKey: ["maintenance-tasks", engineMake, engineModel],
    queryFn: async () => {
      let query = supabase.from("maintenance_tasks").select("*").order("sort_order");
      if (engineMake) query = query.eq("engine_make", engineMake);
      if (engineModel) query = query.ilike("engine_model_pattern", `%${engineModel}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useServiceRecords(boatId: string | undefined) {
  return useQuery({
    queryKey: ["service-records", boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("boat_id", boatId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boatId,
  });
}

export function useCreateServiceRecord() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (record: Omit<InsertTables<"service_records">, "owner_id">) => {
      const { data, error } = await supabase
        .from("service_records")
        .insert({ ...record, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-records"] }),
  });
}

// ============================================================
// CREW
// ============================================================
export function useCrewMembers(role?: string) {
  return useQuery({
    queryKey: ["crew-members", role],
    queryFn: async () => {
      let query = supabase.from("crew_members").select("*").order("rating", { ascending: false });
      if (role) query = query.eq("role", role as any);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================
// SPENDING / ANALYTICS
// ============================================================
export function useOwnerSpending() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owner-spending", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, title, category, date, status,
          boat:boats(name, make, model, year),
          bids:bids!bids_project_id_fkey!inner(price, accepted)
        `)
        .eq("owner_id", user!.id)
        .eq("status", "completed")
        .eq("bids.accepted", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// ============================================================
// STORAGE HELPERS
// ============================================================
export async function uploadProjectPhoto(projectId: string, file: File): Promise<string> {
  const path = `${projectId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("project-photos").upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("project-photos").getPublicUrl(path);
  return publicUrl;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  return publicUrl;
}
