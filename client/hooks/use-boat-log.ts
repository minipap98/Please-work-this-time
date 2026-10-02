import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import type { Database, Tables } from "@/lib/database.types";
import type { LogEntry, LogLine, LogSource } from "@shared/boatLog";

export type MaintenanceCategory = Database["public"]["Enums"]["maintenance_category"];

export const LOG_CATEGORIES: MaintenanceCategory[] = [
  "Engine Oil & Fuel",
  "Cooling System",
  "Drivetrain",
  "Electrical & Safety",
  "Hull & Bottom",
];

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
      engineHours: 304, cost: 1186.42, laborHours: 4.5, vendorName: "MarineMax Service Center", source: "vendor",
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
      engineHours: 256, cost: 742.6, laborHours: 3, vendorName: "MarineMax Service Center", source: "vendor",
      lines: [
        { kind: "labor", description: "Annual service labor", quantity: 3, unitPrice: 140 },
        { kind: "part", description: "Aluminum anode kit", quantity: 1, unitPrice: 89 },
        { kind: "part", description: "Water separating fuel filter", quantity: 1, unitPrice: 32 },
      ],
    }),
    e({ id: "d5", title: "Batteries — 2× group 31 AGM", date: "2025-04-22", category: "Electrical & Safety", cost: 610, vendorName: "Key Marine Electric", source: "bosun-job" }),
    e({ id: "d6", title: "Hull wax & detail", date: "2024-08-05", category: "Hull & Bottom", cost: 450, vendorName: "Biscayne Detail Co." }),
    e({ id: "d7", title: "100-hour service", date: "2023-02-10", category: "Engine Oil & Fuel", engineHours: 102, cost: 520, vendorName: "MarineMax Service Center", source: "vendor" }),
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

function mapLines(raw: unknown): LogLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => ({
      kind: (l.kind === "part" || l.kind === "fee" ? l.kind : "labor") as LogLine["kind"],
      description: String(l.description ?? ""),
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice ?? l.unit_price) || 0,
    }));
}

function mapRecord(r: Tables<"service_records">): LogEntry {
  return {
    id: r.id,
    boatId: r.boat_id,
    title: r.title,
    category: r.category,
    date: r.date,
    engineHours: r.engine_hours,
    cost: r.cost != null ? Number(r.cost) : null,
    laborHours: r.labor_hours != null ? Number(r.labor_hours) : null,
    vendorName: r.vendor_name,
    notes: r.notes,
    source: (r.source as LogSource) ?? "owner",
    lines: mapLines(r.line_items),
  };
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
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("boat_id", boatId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRecord);
    },
    enabled: !!boatId,
  });
}

export interface NewLogEntry {
  boatId: string;
  title: string;
  category: MaintenanceCategory | null;
  date: string;
  engineHours: number | null;
  cost: number | null;
  vendorName: string | null;
  notes: string | null;
}

export function useAddLogEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: NewLogEntry) => {
      if (isDemoMode()) {
        saveDemo([
          { ...entry, id: `own-${Date.now()}`, laborHours: null, source: "owner", lines: [] },
          ...loadDemo(),
        ]);
        return;
      }
      const { error } = await supabase.from("service_records").insert({
        boat_id: entry.boatId,
        owner_id: user!.id,
        title: entry.title,
        category: entry.category,
        date: entry.date,
        engine_hours: entry.engineHours,
        cost: entry.cost,
        vendor_name: entry.vendorName,
        notes: entry.notes,
      });
      if (error) throw error;
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
      const { error } = await supabase.from("service_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["boat-log", v.boatId] }),
  });
}
