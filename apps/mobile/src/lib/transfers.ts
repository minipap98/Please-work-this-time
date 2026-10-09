// Handing a boat to its buyer, and accepting one: hooks over the shared transfer functions.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptBoatTransfer, cancelBoatTransfer, createBoatTransfer, listIncomingTransfers, listOutgoingTransfers, previewBoatTransfer } from "@bosun/shared/boats/transfer";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export function useOutgoingTransfers() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["boat-transfers", "out", user?.id], queryFn: () => listOutgoingTransfers(supabase, user!.id), enabled: !!user });
}

/** Live transfers addressed to my account's email. */
export function useIncomingTransfers() {
  const { user, profile } = useAuth();
  return useQuery({ queryKey: ["boat-transfers", "in", user?.id], queryFn: () => listIncomingTransfers(supabase, user!.id), enabled: !!user && profile?.role !== "vendor" });
}

export function useTransferPreview(token: string | undefined) {
  return useQuery({ queryKey: ["boat-transfer-preview", token], queryFn: () => previewBoatTransfer(supabase, token!), enabled: !!token, retry: false });
}

export function useTransferActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  // A handover changes both sides' boat lists and the jobs that name the boat.
  const done = () => {
    qc.invalidateQueries({ queryKey: ["boat-transfers"] });
    qc.invalidateQueries({ queryKey: ["boat-transfer-preview"] });
    qc.invalidateQueries({ queryKey: ["boats"] });
    qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
  };
  return {
    create: useMutation({ mutationFn: (v: { boatId: string; toEmail: string; includeCosts: boolean }) => createBoatTransfer(supabase, user!.id, v), onSuccess: done }),
    cancel: useMutation({ mutationFn: (id: string) => cancelBoatTransfer(supabase, id), onSuccess: done }),
    accept: useMutation({ mutationFn: (token: string) => acceptBoatTransfer(supabase, token, user!.id), onSuccess: done }),
  };
}
