// Owners' community: hooks over the shared community functions.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  type NewPost,
} from "@bosun/shared/community/community";
import type { PhotoInput } from "@bosun/shared/marketplace/photos";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

/** Params for /owners/board from a group or a post. */
export const boardParams = (g: { makeKey: string; modelKey: string | null }) => ({ make: g.makeKey, ...(g.modelKey ? { model: g.modelKey } : {}) });

function useIsOwner() {
  const { user, profile } = useAuth();
  return !!user && profile?.role !== "vendor";
}

export function useMyGroups() {
  const { user } = useAuth();
  const owner = useIsOwner();
  return useQuery({ queryKey: ["community", "my-groups", user?.id], queryFn: () => myCommunityGroups(supabase), enabled: owner, staleTime: 60_000 });
}

export function useActiveGroups() {
  const owner = useIsOwner();
  return useQuery({ queryKey: ["community", "active-groups"], queryFn: () => activeCommunityGroups(supabase), enabled: owner, staleTime: 60_000 });
}

/** One group's board. `model` null = the whole make. */
export function useCommunityFeed(make: string | undefined, model: string | null | undefined, limit = 50) {
  const owner = useIsOwner();
  return useQuery({
    queryKey: ["community", "feed", make, model ?? null, limit],
    queryFn: () => communityFeed(supabase, make!, model ?? null, limit),
    enabled: owner && !!make,
    staleTime: 30_000,
  });
}

export function useCommunityThread(id: string | undefined) {
  const owner = useIsOwner();
  return useQuery({ queryKey: ["community", "thread", id], queryFn: () => communityThread(supabase, id!), enabled: owner && !!id });
}

export function useCommunityActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const done = () => qc.invalidateQueries({ queryKey: ["community"] });
  return {
    /** Returns the new post's id. The photo (already resized) is uploaded first. */
    post: useMutation({
      mutationFn: async (v: Omit<NewPost, "photoUrl"> & { photo?: PhotoInput | null }) => {
        const photoUrl = v.photo ? await uploadCommunityPhoto(supabase, user!.id, v.photo) : null;
        return createPost(supabase, user!.id, { ...v, photoUrl });
      },
      onSuccess: done,
    }),
    deletePost: useMutation({ mutationFn: (id: string) => deletePost(supabase, id), onSuccess: done }),
    reply: useMutation({ mutationFn: (v: { postId: string; body: string }) => createReply(supabase, user!.id, v.postId, v.body), onSuccess: done }),
    deleteReply: useMutation({ mutationFn: (id: string) => deleteReply(supabase, id), onSuccess: done }),
    report: useMutation({
      mutationFn: (v: { target: { postId: string } | { replyId: string }; reason: string }) => reportContent(supabase, user!.id, v.target, v.reason),
    }),
  };
}
