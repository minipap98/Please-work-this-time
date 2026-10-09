// Owners' community: the groups my boats put me in, a group's board, one thread, and the writes.
// The demo shows canned threads for the demo boat and can't post.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import { resizePhoto } from "@/lib/photoUtils";
import { DEMO_ACTIVE_GROUPS, DEMO_GROUPS, demoFeed, demoThread } from "@/data/demoCommunity";
import {
  activeCommunityGroups,
  communityFeed,
  communityThread,
  createPost,
  createReply,
  deletePost,
  deleteReply,
  myCommunityGroups,
  reportContent,
  uploadCommunityPhoto,
  type CommunityFeed,
  type CommunityGroup,
  type CommunityThread,
} from "@shared/community/community";

export type { CommunityAuthor, CommunityFeed, CommunityGroup, CommunityPost, CommunityReply, CommunityThread } from "@shared/community/community";

const DEMO_ERROR = "Not available in the demo. Sign in to post.";

export function useMyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["community", "my-groups", user?.id],
    queryFn: async (): Promise<CommunityGroup[]> => {
      if (isDemoMode()) return DEMO_GROUPS;
      if (supabaseMissing) return [];
      return myCommunityGroups(supabase);
    },
    enabled: isDemoMode() || !!user,
    staleTime: 60_000,
  });
}

export function useActiveGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["community", "active-groups"],
    queryFn: async (): Promise<CommunityGroup[]> => {
      if (isDemoMode()) return DEMO_ACTIVE_GROUPS;
      if (supabaseMissing) return [];
      return activeCommunityGroups(supabase);
    },
    enabled: isDemoMode() || !!user,
    staleTime: 60_000,
  });
}

/** One group's board. `model` null = the whole make. */
export function useCommunityFeed(make: string | undefined, model: string | null | undefined, limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["community", "feed", make, model ?? null, limit],
    queryFn: async (): Promise<CommunityFeed | null> => {
      if (isDemoMode()) return demoFeed(make!, model ?? null);
      if (supabaseMissing) return null;
      return communityFeed(supabase, make!, model ?? null, limit);
    },
    enabled: !!make && (isDemoMode() || !!user),
    staleTime: 30_000,
  });
}

export function useCommunityThread(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["community", "thread", id],
    queryFn: async (): Promise<CommunityThread | null> => {
      if (isDemoMode()) return demoThread(id!);
      if (supabaseMissing) return null;
      return communityThread(supabase, id!);
    },
    enabled: !!id && (isDemoMode() || !!user),
    staleTime: 15_000,
  });
}

function useInvalidateCommunity() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["community"] });
}

export interface NewPostInput {
  make: string;
  model: string | null;
  title: string;
  body: string;
  boatId?: string | null;
  /** Resized and uploaded before the post is written. */
  photo?: File | null;
}

/** Returns the new post's id. */
export function useCreatePost() {
  const { user } = useAuth();
  const done = useInvalidateCommunity();
  return useMutation({
    mutationFn: async (input: NewPostInput): Promise<string> => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      let photoUrl: string | null = null;
      if (input.photo) {
        const dataUrl = await resizePhoto(input.photo, 1600, 0.8);
        photoUrl = await uploadCommunityPhoto(supabase, user!.id, dataUrl);
      }
      return createPost(supabase, user!.id, { ...input, photoUrl });
    },
    onSuccess: done,
  });
}

export function useDeletePost() {
  const done = useInvalidateCommunity();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      await deletePost(supabase, id);
    },
    onSuccess: done,
  });
}

export function useCreateReply() {
  const { user } = useAuth();
  const done = useInvalidateCommunity();
  return useMutation({
    mutationFn: async (v: { postId: string; body: string }): Promise<string> => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      return createReply(supabase, user!.id, v.postId, v.body);
    },
    onSuccess: done,
  });
}

export function useDeleteReply() {
  const done = useInvalidateCommunity();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      await deleteReply(supabase, id);
    },
    onSuccess: done,
  });
}

export function useReportContent() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (v: { target: { postId: string } | { replyId: string }; reason: string }) => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      await reportContent(supabase, user!.id, v.target, v.reason);
    },
  });
}
