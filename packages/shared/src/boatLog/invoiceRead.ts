// Reading an uploaded invoice (PDF or photo) with the server, and turning what it read into
// Boat Log entries. The apps upload the file to boat-documents themselves (bytes differ per
// platform); everything after that is here.

import type { ApiClient } from "../api/client";
import type { Db } from "../db/client";
import { invoiceCheck, invoiceToLogLines, normalizeInvoice, type ExtractedInvoice } from "../invoice";
import type { NewLogEntry } from "./records";

export const MAX_INVOICE_BYTES = 15 * 1024 * 1024;

/** `path` is null only for the web demo, which uploads nothing. */
export type InvoiceRead =
  | { status: "read"; invoice: ExtractedInvoice; path: string | null }
  | { status: "manual"; reason: string; path: string | null };

/** Where an owner's invoice upload lives: their own folder, per boat. */
export function invoiceUploadPath(ownerId: string, boatId: string, isPdf: boolean, now: number = Date.now()): string {
  return `${ownerId}/invoices/${boatId}/${now}.${isPdf ? "pdf" : "jpg"}`;
}

export async function uploadInvoice(client: Db, path: string, bytes: Uint8Array | Blob, isPdf: boolean): Promise<void> {
  const { error } = await client.storage.from("boat-documents").upload(path, bytes, { contentType: isPdf ? "application/pdf" : "image/jpeg" });
  if (error) throw error;
}

/** Ask the server to read an uploaded invoice. A failed read still keeps the file with the entry. */
export async function readInvoice(api: ApiClient, path: string): Promise<InvoiceRead> {
  const res = await api.post<{ invoice?: unknown }>("/api/invoices/extract", { path });
  if (res.ok && res.body.invoice) return { status: "read", invoice: normalizeInvoice(res.body.invoice), path };
  return {
    status: "manual",
    reason:
      res.body.code === "not_configured"
        ? "Automatic reading isn't switched on yet, so fill in the details below. Your invoice is saved with the entry."
        : `${res.body.error ?? `Invoice reading failed (server error ${res.status}).`} Your invoice is saved with the entry, so fill in the details below.`,
    path,
  };
}

/** One Boat Log entry from a read invoice (the web's single-entry save). */
export function invoiceToLogEntry(inv: ExtractedInvoice, boatId: string, path: string | null, notes: string | null): NewLogEntry {
  const lines = invoiceToLogLines(inv);
  const noteLines = [notes?.trim(), inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : null].filter(Boolean);
  return {
    boatId,
    title: inv.title ?? "Service",
    category: inv.category,
    date: inv.date ?? new Date().toISOString().slice(0, 10),
    engineHours: inv.engineHours,
    cost: inv.total ?? (lines.length ? invoiceCheck(inv).computed : null),
    vendorName: inv.shop,
    notes: noteLines.length ? noteLines.join("\n") : null,
    laborHours: inv.laborHours,
    lines,
    invoicePath: path,
    invoiceNumber: inv.invoiceNumber,
  };
}
