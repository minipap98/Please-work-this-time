// Find a shop: public vendor profiles and their reviews.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorProfile, listVendorProfiles } from "@bosun/shared/vendors/profile";
import { createReview, getMyReview, listVendorReviews, type NewReview } from "@bosun/shared/vendors/reviews";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export function useVendorProfiles() {
  return useQuery({ queryKey: ["vendor-profiles"], queryFn: () => listVendorProfiles(supabase), staleTime: 5 * 60 * 1000 });
}

export function useVendorProfile(id: string | undefined) {
  return useQuery({ queryKey: ["vendor-profile", id], queryFn: () => getVendorProfile(supabase, id!), enabled: !!id });
}

export function useVendorReviews(vendorId: string | undefined) {
  return useQuery({ queryKey: ["reviews", vendorId], queryFn: () => listVendorReviews(supabase, vendorId!), enabled: !!vendorId });
}

export function useMyReview(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({ queryKey: ["my-review", projectId, user?.id], queryFn: () => getMyReview(supabase, projectId!, user!.id), enabled: !!projectId && !!user });
}

export function useCreateReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (review: NewReview) => createReview(supabase, user!.id, review),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["reviews", v.vendorId] });
      qc.invalidateQueries({ queryKey: ["my-review", v.projectId] });
      qc.invalidateQueries({ queryKey: ["vendor-profiles"] });
    },
  });
}
