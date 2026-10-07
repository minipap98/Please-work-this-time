import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import { invoiceToLogLines, normalizeInvoice, type ExtractedInvoice } from "@shared/invoice";
import { resizePhoto } from "@/lib/photoUtils";
import { toHistoryEntry, type LogEntry, type SharedHistory } from "@shared/boatLog";
import { addLogEntry, deleteLogEntry, invoiceSignedUrl, listBoatLog, type NewLogEntry } from "@shared/boatLog/records";
import { createHistoryShare, getHistoryShare, publicHistory, revokeHistoryShare, setHistoryShareCosts, type HistoryShare } from "@shared/boatLog/shares";
import { invoiceUploadPath, readInvoice as readInvoiceWithServer, uploadInvoice, type InvoiceRead } from "@shared/boatLog/invoiceRead";
import { listReceiptInbox, resolveReceipt, type InboxReceipt } from "@shared/boatLog/receipts";
import { api } from "@/lib/api";

export { LOG_CATEGORIES, type MaintenanceCategory, type NewLogEntry } from "@shared/boatLog/records";
export { type HistoryShare } from "@shared/boatLog/shares";
export { type InvoiceRead } from "@shared/boatLog/invoiceRead";
export { type InboxReceipt } from "@shared/boatLog/receipts";

export interface LogBoat {
  id: string;
  name: string;
  label: string;
  engine: string;
  hin?: string | null;
}

export const DEMO_LOG_BOAT: LogBoat = {
  id: "demo-boat",
  name: "No Vacancy",
  label: "2020 Sea Ray SDX 250 OB",
  engine: "Mercury Verado 250",
};

const DEMO_KEY = "bosun_demo_boat_log_v1";

function demoEntries(): LogEntry[] {
  const e = (p: Partial<LogEntry> & Pick<LogEntry, "id" | "title" | "date">): LogEntry => ({
    boatId: DEMO_LOG_BOAT.id,
    category: null,
    engineHours: null,
    cost: null,
    laborHours: null,
    vendorName: null,
    notes: null,
    source: "owner",
    lines: [],
    ...p,
  });
  return [
    e({
      id: "d1", title: "300-hour service, Verado 250", date: "2026-08-14", category: "Engine Oil & Fuel",
      engineHours: 304, cost: 1186.42, laborHours: 4.5, vendorName: "Dean's Marine", source: "vendor",
      notes: "Raw-water impeller showed vane set; replaced. Recommend checking trim fluid at next haul.",
      lines: [
        { kind: "labor", description: "300-hr service labor", quantity: 4.5, unitPrice: 145 },
        { kind: "part", description: "Mercury oil filter 35-877769K01", quantity: 1, unitPrice: 18.5 },
        { kind: "part", description: "25W-50 synthetic blend, qt", quantity: 7, unitPrice: 13.95 },
        { kind: "part", description: "Water pump impeller kit", quantity: 1, unitPrice: 74.95 },
        { kind: "part", description: "Gear lube, qt", quantity: 2, unitPrice: 16.5 },
        { kind: "part", description: "Spark plug NGK ILFR6G", quantity: 6, unitPrice: 15.5 },
        { kind: "fee", description: "Shop supplies & disposal", quantity: 1, unitPrice: 35 },
      ],
    }),
    e({
      id: "d2", title: "Bottom paint, 2 coats ablative", date: "2026-03-22", category: "Hull & Bottom",
      cost: 1940, laborHours: 11, vendorName: "Rickenbacker Boatyard", source: "bosun-job",
      lines: [
        { kind: "labor", description: "Haul, wash, block", quantity: 1, unitPrice: 380 },
        { kind: "labor", description: "Sand + 2 coats ablative", quantity: 1, unitPrice: 1002 },
        { kind: "part", description: "Ablative bottom paint, gal", quantity: 2, unitPrice: 279 },
      ],
    }),
    e({ id: "d3", title: "Washdown pump replaced", date: "2025-11-02", category: "Electrical & Safety", cost: 189, notes: "DIY. Jabsco 18680." }),
    e({
      id: "d4", title: "Annual service + anodes", date: "2025-06-14", category: "Engine Oil & Fuel",
      engineHours: 256, cost: 742.6, laborHours: 3, vendorName: "Dean's Marine", source: "vendor",
      lines: [
        { kind: "labor", description: "Annual service labor", quantity: 3, unitPrice: 140 },
        { kind: "part", description: "Aluminum anode kit", quantity: 1, unitPrice: 89 },
        { kind: "part", description: "Water separating fuel filter", quantity: 1, unitPrice: 32 },
      ],
    }),
    e({ id: "d5", title: "Batteries — 2× group 31 AGM", date: "2025-04-22", category: "Electrical & Safety", cost: 610, vendorName: "Key Marine Electric", source: "bosun-job" }),
    e({ id: "d6", title: "Hull wax & detail", date: "2024-08-05", category: "Hull & Bottom", cost: 450, vendorName: "Biscayne Detail Co." }),
    e({ id: "d7", title: "100-hour service", date: "2023-02-10", category: "Engine Oil & Fuel", engineHours: 102, cost: 520, vendorName: "Dean's Marine", source: "vendor" }),
  ];
}

function loadDemo(): LogEntry[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as LogEntry[];
  } catch {
    // seed below
  }
  return demoEntries();
}

function saveDemo(entries: LogEntry[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function useLogBoats() {
  const { user } = useAuth();
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["log-boats", demo ? "demo" : user?.id],
    queryFn: async (): Promise<LogBoat[]> => {
      if (isDemoMode()) return [DEMO_LOG_BOAT];
      const { data, error } = await supabase
        .from("boats")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        label: [b.year, b.make, b.model].filter(Boolean).join(" "),
        engine: [b.engine_count && b.engine_count > 1 ? `${b.engine_count}×` : "", b.engine_make, b.engine_model]
          .filter(Boolean)
          .join(" "),
      }));
    },
    enabled: demo || (!!user && !supabaseMissing),
  });
}

export function useBoatLog(boatId: string | undefined) {
  return useQuery({
    queryKey: ["boat-log", boatId],
    queryFn: async (): Promise<LogEntry[]> => {
      if (isDemoMode()) return loadDemo().filter((e) => e.boatId === boatId);
      return listBoatLog(supabase, boatId!);
    },
    enabled: !!boatId,
  });
}

export function useAddLogEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: NewLogEntry) => {
      if (isDemoMode()) {
        saveDemo([
          {
            ...entry,
            id: `own-${Date.now()}`,
            laborHours: entry.laborHours ?? null,
            source: "owner",
            lines: entry.lines ?? [],
            invoicePath: entry.invoicePath ?? null,
          },
          ...loadDemo(),
        ]);
        return;
      }
      await addLogEntry(supabase, user!.id, entry);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["boat-log", v.boatId] });
      qc.invalidateQueries({ queryKey: ["service-records"] });
    },
  });
}

export function useDeleteLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; boatId: string }) => {
      if (isDemoMode()) {
        saveDemo(loadDemo().filter((e) => e.id !== id));
        return;
      }
      await deleteLogEntry(supabase, id);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["boat-log", v.boatId] }),
  });
}

// ── Shareable service history ────────────────────────────────────────────────

const DEMO_SHARE_KEY = "bosun_demo_history_share_v1";
export const DEMO_SHARE_TOKEN = "demo-no-vacancy";

function loadDemoShare(): HistoryShare | null {
  try {
    const raw = localStorage.getItem(DEMO_SHARE_KEY);
    return raw ? (JSON.parse(raw) as HistoryShare) : null;
  } catch {
    return null;
  }
}

function saveDemoShare(share: HistoryShare | null) {
  try {
    if (share) localStorage.setItem(DEMO_SHARE_KEY, JSON.stringify(share));
    else localStorage.removeItem(DEMO_SHARE_KEY);
  } catch {
    // ignore
  }
}

export function historyShareUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bosunapp.vercel.app";
  return `${origin}/history/${token}`;
}

/** The boat's live share link, if any. */
export function useHistoryShare(boatId: string | undefined) {
  return useQuery({
    queryKey: ["history-share", boatId],
    queryFn: async (): Promise<HistoryShare | null> => {
      if (isDemoMode()) return loadDemoShare();
      return getHistoryShare(supabase, boatId!);
    },
    enabled: !!boatId,
  });
}

export function useCreateHistoryShare() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ boatId, showCosts }: { boatId: string; showCosts: boolean }): Promise<HistoryShare> => {
      if (isDemoMode()) {
        const share = { id: "demo-share", token: DEMO_SHARE_TOKEN, showCosts, createdAt: new Date().toISOString() };
        saveDemoShare(share);
        return share;
      }
      return createHistoryShare(supabase, user!.id, boatId, showCosts);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["history-share", v.boatId] }),
  });
}

export function useSetHistoryCosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ share, showCosts }: { share: HistoryShare; showCosts: boolean; boatId: string }) => {
      if (isDemoMode()) {
        saveDemoShare({ ...share, showCosts });
        return;
      }
      await setHistoryShareCosts(supabase, share.id, showCosts);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["history-share", v.boatId] }),
  });
}

/** Turns the link off. Anyone who has it sees "no longer shared". */
export function useRevokeHistoryShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ share }: { share: HistoryShare; boatId: string }) => {
      if (isDemoMode()) {
        saveDemoShare(null);
        return;
      }
      await revokeHistoryShare(supabase, share.id);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["history-share", v.boatId] }),
  });
}

/** Public, no login: the shared history behind a link. */
export function usePublicHistory(token: string | undefined) {
  return useQuery({
    queryKey: ["public-history", token],
    queryFn: async (): Promise<SharedHistory | null> => {
      if (token === DEMO_SHARE_TOKEN) {
        const showCosts = loadDemoShare()?.showCosts ?? false;
        return {
          boat: { name: DEMO_LOG_BOAT.name, year: "2020", make: "Sea Ray", model: "SDX 250 OB", engine: DEMO_LOG_BOAT.engine },
          showCosts,
          sharedAt: new Date().toISOString(),
          entries: loadDemo().map((e) => toHistoryEntry(e, showCosts)).sort((a, b) => b.date.localeCompare(a.date)),
        };
      }
      if (supabaseMissing) return null;
      return publicHistory(supabase, token!);
    },
    enabled: !!token,
    retry: false,
  });
}

// ── Invoice import ───────────────────────────────────────────────────────────

/** A canned read for the demo, shaped like a real twin-outboard 300-hour service. */
function demoInvoice(): ExtractedInvoice {
  return normalizeInvoice({
    shop: "Harborside Marine Service",
    invoiceNumber: "20349",
    date: "2025-04-22",
    boat: "Sea Ray SDX 250 OB, Mercury Verado 250",
    engineHours: 210,
    title: "200-hour service: water pump, thermostats, anodes",
    category: "Cooling System",
    laborHours: 6.5,
    lines: [
      { kind: "part", partNumber: "8M0162830", description: "Water pump kit", quantity: 1, unitPrice: 189.95, amount: 189.95 },
      { kind: "part", partNumber: "8M0083961", description: "Thermostat", quantity: 2, unitPrice: 48.5, amount: 97 },
      { kind: "part", partNumber: "8M0066104", description: "Oil filter", quantity: 1, unitPrice: 24.99, amount: 24.99 },
      { kind: "part", partNumber: "92-8M0078628", description: "25W-40 4-stroke oil (qt)", quantity: 7, unitPrice: 14.99, amount: 104.93 },
      { kind: "part", partNumber: "8M0107591", description: "Anode kit", quantity: 1, unitPrice: 142.0, amount: 142 },
      { kind: "fee", partNumber: null, description: "Shop materials", quantity: 1, unitPrice: 25, amount: 25 },
      { kind: "labor", partNumber: null, description: "Labor (6.5 hrs @ $155)", quantity: 6.5, unitPrice: 155, amount: 1007.5 },
    ],
    tax: 112.71,
    total: 1704.08,
  });
}

/** Upload an invoice (PDF or photo) to the owner's private folder and read it. */
export function useReadInvoice() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, boatId }: { file: File; boatId: string }): Promise<InvoiceRead> => {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 1400));
        return { status: "read", invoice: demoInvoice(), path: null };
      }
      if (!user || supabaseMissing) throw new Error("Sign in to import invoices.");
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let body: Blob = file;
      if (!isPdf) {
        // Phone photos are huge; a 2000px JPEG is plenty to read and keeps uploads quick.
        body = await (await fetch(await resizePhoto(file, 2000, 0.85))).blob();
      }
      if (body.size > 15 * 1024 * 1024) throw new Error("That file is over 15 MB. Try a smaller scan or a photo.");
      const path = invoiceUploadPath(user.id, boatId, isPdf);
      await uploadInvoice(supabase, path, body, isPdf);
      return readInvoiceWithServer(api, path);
    },
  });
}

export { invoiceToLogLines };

/** Short-lived link to view a private invoice. */
export async function invoiceUrl(path: string): Promise<string | null> {
  return invoiceSignedUrl(supabase, path);
}


/* ── Emailed receipts waiting for review ─────────────────────────────────── */

export function useReceiptInbox() {
  const { user } = useAuth();
  const demo = isDemoMode();
  return useQuery({
    queryKey: ["receipt-inbox", user?.id],
    queryFn: async (): Promise<InboxReceipt[]> => {
      return listReceiptInbox(supabase, user!.id);
    },
    enabled: !!user && !demo,
    // Poll quickly while something is still being read, otherwise once a minute.
    refetchInterval: (q) => (q.state.data?.some((r) => r.reading) ? 5_000 : 60_000),
  });
}

export function useResolveReceipt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "added" | "dismissed" }) => {
      await resolveReceipt(supabase, id, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipt-inbox", user?.id] }),
  });
}
