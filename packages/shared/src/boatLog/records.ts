// The Boat Log's rows (service_records): reading them into LogEntry and the owner's own writes.
// Shop-verified rows are written only by database triggers; owners can only touch source = 'owner'.

import type { Db } from "../db/client";
import type { Database, Tables } from "../database.types";
import type { LogEntry, LogLine, LogSource } from "../boatLog";
import { HOURS_READING_TITLE } from "../boatLog";

export type MaintenanceCategory = Database["public"]["Enums"]["maintenance_category"];

export const LOG_CATEGORIES: MaintenanceCategory[] = ["Engine Oil & Fuel", "Cooling System", "Drivetrain", "Electrical & Safety", "Hull & Bottom"];

export function mapLogLines(raw: unknown): LogLine[] {
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

export function mapLogRecord(r: Tables<"service_records">): LogEntry {
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
    lines: mapLogLines(r.line_items),
    invoicePath: r.invoice_path ?? null,
  };
}

/** Newest first. Row-level rules limit this to the owner's own boats. */
export async function listBoatLog(client: Db, boatId: string): Promise<LogEntry[]> {
  const { data, error } = await client.from("service_records").select("*").eq("boat_id", boatId).order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLogRecord);
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
  laborHours?: number | null;
  lines?: LogLine[];
  invoicePath?: string | null;
  invoiceNumber?: string | null;
}

type LineItemsJson = Database["public"]["Tables"]["service_records"]["Insert"]["line_items"];

const INVOICE_MIGRATION = "Invoice import needs a quick database update (20261011_invoice_import.sql). Ask your admin to run it.";

/** The entry an "update hours" tap writes: just the meter and the date. */
export function hoursReadingEntry(boatId: string, hours: number, date: string): NewLogEntry {
  return { boatId, title: HOURS_READING_TITLE, category: null, date, engineHours: hours, cost: null, vendorName: null, notes: null };
}

/** What's wrong with an hours reading, or null. A reading below the last one is almost always a typo. */
export function hoursReadingProblem(hours: number | null, lastHours: number | null): string | null {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return "Enter the hours shown on the meter.";
  if (lastHours != null && hours < lastHours) return `The log already has ${lastHours} hours. Meters only go up; check the number.`;
  return null;
}

export async function addLogEntry(client: Db, ownerId: string, entry: NewLogEntry): Promise<void> {
  const { error } = await client.from("service_records").insert({
    boat_id: entry.boatId,
    owner_id: ownerId,
    title: entry.title,
    category: entry.category,
    date: entry.date,
    engine_hours: entry.engineHours,
    cost: entry.cost,
    vendor_name: entry.vendorName,
    notes: entry.notes,
    ...(entry.laborHours != null ? { labor_hours: entry.laborHours } : {}),
    ...(entry.lines?.length ? { line_items: entry.lines as unknown as LineItemsJson } : {}),
    ...(entry.invoicePath ? { invoice_path: entry.invoicePath, invoice_number: entry.invoiceNumber ?? null } : {}),
  });
  if (error) {
    if (/invoice_(path|number)/.test(error.message)) throw new Error(INVOICE_MIGRATION);
    throw error;
  }
}

export type LogEntryPatch = Partial<Pick<NewLogEntry, "title" | "category" | "date" | "engineHours" | "cost" | "vendorName" | "notes" | "laborHours" | "lines">>;

/** Owners can edit only their own (unverified) entries; the database refuses the rest silently (0 rows). */
export async function updateLogEntry(client: Db, id: string, patch: LogEntryPatch): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.engineHours !== undefined) row.engine_hours = patch.engineHours;
  if (patch.cost !== undefined) row.cost = patch.cost;
  if (patch.vendorName !== undefined) row.vendor_name = patch.vendorName;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.laborHours !== undefined) row.labor_hours = patch.laborHours;
  if (patch.lines !== undefined) row.line_items = patch.lines;
  const { error } = await client.from("service_records").update(row as never).eq("id", id);
  if (error) throw error;
}

export async function deleteLogEntry(client: Db, id: string): Promise<void> {
  const { error } = await client.from("service_records").delete().eq("id", id);
  if (error) throw error;
}

/** Short-lived link to a private invoice file in boat-documents. */
export async function invoiceSignedUrl(client: Db, path: string, seconds = 600): Promise<string | null> {
  const { data } = await client.storage.from("boat-documents").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

/** The text the maintenance matcher reads: title, notes and every line description. */
export function logEntryText(e: Pick<LogEntry, "title" | "notes" | "lines">): string {
  return [e.title, e.notes, ...e.lines.map((l) => l.description)].filter(Boolean).join(" · ");
}
