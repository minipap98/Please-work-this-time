// The Boat Log, share links, emailed receipts and invoice reading.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addLogEntry, deleteLogEntry, listBoatLog, updateLogEntry, type LogEntryPatch, type NewLogEntry } from "@bosun/shared/boatLog/records";
import { invoiceUploadPath, readInvoice, uploadInvoice, type InvoiceRead } from "@bosun/shared/boatLog/invoiceRead";
import { listReceiptInbox, resolveReceipt } from "@bosun/shared/boatLog/receipts";
import { createHistoryShare, getHistoryShare, publicHistory, revokeHistoryShare, setHistoryShareCosts } from "@bosun/shared/boatLog/shares";
import { api } from "./api";
import { useAuth } from "./auth";
import type { PickedFile } from "./files";
import { supabase } from "./supabase";

export function useBoatLog(boatId: string | undefined) {
  return useQuery({ queryKey: ["boat-log", boatId], queryFn: () => listBoatLog(supabase, boatId!), enabled: !!boatId });
}

function useInvalidateLog() {
  const qc = useQueryClient();
  return (boatId: string) => {
    qc.invalidateQueries({ queryKey: ["boat-log", boatId] });
    qc.invalidateQueries({ queryKey: ["service-plan"] });
  };
}

export function useAddLogEntry() {
  const { user } = useAuth();
  const done = useInvalidateLog();
  return useMutation({ mutationFn: (entry: NewLogEntry) => addLogEntry(supabase, user!.id, entry), onSuccess: (_d, v) => done(v.boatId) });
}

export function useUpdateLogEntry() {
  const done = useInvalidateLog();
  return useMutation({ mutationFn: (v: { id: string; boatId: string; patch: LogEntryPatch }) => updateLogEntry(supabase, v.id, v.patch), onSuccess: (_d, v) => done(v.boatId) });
}

export function useDeleteLogEntry() {
  const done = useInvalidateLog();
  return useMutation({ mutationFn: (v: { id: string; boatId: string }) => deleteLogEntry(supabase, v.id), onSuccess: (_d, v) => done(v.boatId) });
}

// ── Share links ───────────────────────────────────────────────────────────────

export function useHistoryShare(boatId: string | undefined) {
  return useQuery({ queryKey: ["history-share", boatId], queryFn: () => getHistoryShare(supabase, boatId!), enabled: !!boatId });
}

export function useShareActions(boatId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const done = () => qc.invalidateQueries({ queryKey: ["history-share", boatId] });
  return {
    create: useMutation({ mutationFn: (showCosts: boolean) => createHistoryShare(supabase, user!.id, boatId!, showCosts), onSuccess: done }),
    setCosts: useMutation({ mutationFn: (v: { shareId: string; showCosts: boolean }) => setHistoryShareCosts(supabase, v.shareId, v.showCosts), onSuccess: done }),
    revoke: useMutation({ mutationFn: (shareId: string) => revokeHistoryShare(supabase, shareId), onSuccess: done }),
  };
}

export function usePublicHistory(token: string | undefined) {
  return useQuery({ queryKey: ["public-history", token], queryFn: () => publicHistory(supabase, token!), enabled: !!token, retry: false });
}

// ── Invoice import ────────────────────────────────────────────────────────────

/** Upload the picked file to the owner's private folder, then have the server read it. */
export function useReadInvoice() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (v: { file: PickedFile; boatId: string }): Promise<InvoiceRead> => {
      const path = invoiceUploadPath(user!.id, v.boatId, v.file.isPdf);
      await uploadInvoice(supabase, path, v.file.bytes, v.file.isPdf);
      return readInvoice(api, path);
    },
  });
}

// ── Emailed receipts ──────────────────────────────────────────────────────────

export function useReceiptInbox() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["receipt-inbox", user?.id],
    queryFn: () => listReceiptInbox(supabase, user!.id),
    enabled: !!user,
    refetchInterval: (q) => (q.state.data?.some((r) => r.reading) ? 5_000 : 60_000),
  });
}

export function useResolveReceipt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (v: { id: string; status: "added" | "dismissed" }) => resolveReceipt(supabase, v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipt-inbox", user?.id] }),
  });
}
