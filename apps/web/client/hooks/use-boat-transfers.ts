// Handing a boat to its buyer: the seller's outgoing transfers, the buyer's incoming ones, and the
// accept step. The demo has no transfers; its boats never leave the browser.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import {
  acceptBoatTransfer,
  cancelBoatTransfer,
  createBoatTransfer,
  listIncomingTransfers,
  listOutgoingTransfers,
  previewBoatTransfer,
  type BoatTransfer,
  type TransferPreview,
} from "@shared/boats/transfer";

export type { BoatTransfer, TransferPreview } from "@shared/boats/transfer";

const DEMO_ERROR = "Not available in the demo.";

function useInvalidateTransfers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["boat-transfers"] });
    qc.invalidateQueries({ queryKey: ["boats"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

/** Transfers I've started, every status, newest first. */
export function useOutgoingTransfers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boat-transfers", "out", user?.id],
    queryFn: async (): Promise<BoatTransfer[]> => (isDemoMode() ? [] : listOutgoingTransfers(supabase, user!.id)),
    enabled: !!user,
  });
}

/** Live transfers addressed to my account's email. */
export function useIncomingTransfers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boat-transfers", "in", user?.id],
    queryFn: async (): Promise<BoatTransfer[]> => (isDemoMode() ? [] : listIncomingTransfers(supabase, user!.id)),
    enabled: !!user,
  });
}

export function useCreateTransfer() {
  const { user } = useAuth();
  const done = useInvalidateTransfers();
  return useMutation({
    mutationFn: async (input: { boatId: string; toEmail: string; includeCosts: boolean }): Promise<BoatTransfer> => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      return createBoatTransfer(supabase, user!.id, input);
    },
    onSuccess: done,
  });
}

export function useCancelTransfer() {
  const done = useInvalidateTransfers();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      await cancelBoatTransfer(supabase, id);
    },
    onSuccess: done,
  });
}

/** The boat behind a transfer link; null when the token is unknown. */
export function useTransferPreview(token: string | undefined) {
  return useQuery({
    queryKey: ["boat-transfer-preview", token],
    queryFn: async (): Promise<TransferPreview | null> => (isDemoMode() ? null : previewBoatTransfer(supabase, token!)),
    enabled: !!token,
  });
}

/** Returns the boat's id once it's on my account. */
export function useAcceptTransfer() {
  const done = useInvalidateTransfers();
  return useMutation({
    mutationFn: async (token: string): Promise<string> => {
      if (isDemoMode()) throw new Error(DEMO_ERROR);
      return acceptBoatTransfer(supabase, token);
    },
    onSuccess: done,
  });
}
