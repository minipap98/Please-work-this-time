// Reading old service invoices into the Boat Log.
// The server asks Claude for INVOICE_SCHEMA; everything it returns goes through
// normalizeInvoice() and is shown to the owner for review before anything is saved.

import type { LogLine } from "./boatLog";

export const LOG_CATEGORY_VALUES = [
  "Engine Oil & Fuel",
  "Cooling System",
  "Drivetrain",
  "Electrical & Safety",
  "Hull & Bottom",
] as const;
export type InvoiceCategory = (typeof LOG_CATEGORY_VALUES)[number];

export interface InvoiceLine {
  kind: "part" | "labor" | "fee";
  partNumber: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ExtractedInvoice {
  shop: string | null;
  invoiceNumber: string | null;
  date: string | null; // YYYY-MM-DD
  boat: string | null; // as written on the invoice, e.g. "Pursuit 326, F300 Yamaha"
  engineHours: number | null;
  title: string;
  category: InvoiceCategory | null;
  laborHours: number | null;
  lines: InvoiceLine[];
  tax: number | null;
  total: number | null;
}

const str = { type: ["string", "null"] };
const num = { type: ["number", "null"] };

/** JSON schema for structured output. Deliberately has no fields for customer names, emails or card numbers. */
export const INVOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["shop", "invoiceNumber", "date", "boat", "engineHours", "title", "category", "laborHours", "lines", "tax", "total"],
  properties: {
    shop: { ...str, description: "Business that did the work" },
    invoiceNumber: str,
    date: { ...str, description: "Service date as YYYY-MM-DD (the invoice/work date, not a payment stamp)" },
    boat: { ...str, description: "Boat and engines as written, e.g. 'Pursuit 326, twin F300 Yamaha'. No owner names." },
    engineHours: num,
    title: { type: "string", description: "Short log title for the job, e.g. '300-hour service: water pumps, thermostats, anodes'" },
    // Nullable enums have to be spelled as anyOf; a type array with an enum is rejected.
    category: { anyOf: [{ type: "string", enum: [...LOG_CATEGORY_VALUES] }, { type: "null" }] },
    laborHours: num,
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "partNumber", "description", "quantity", "unitPrice", "amount"],
        properties: {
          kind: { type: "string", enum: ["part", "labor", "fee"] },
          partNumber: str,
          description: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          amount: { type: "number" },
        },
      },
    },
    tax: { ...num, description: "Total tax" },
    total: { ...num, description: "Amount the customer paid, including tax and any card fee" },
  },
} as const;

export const INVOICE_PROMPT = `This is a marine service invoice or receipt for a boat. Extract it for the owner's service log.

- One line per part, labor charge or fee, with part numbers when printed. Shop supplies and card fees are "fee" lines. Taxes are not lines; put the tax total in "tax".
- "total" is what was actually paid (if both a check total and a credit card total appear, use the one the payment stamp or card slip shows).
- "date" is when the work was done or invoiced, as YYYY-MM-DD.
- "title" is a short description of the job a boat buyer would understand.
- Pick the closest category, or null if none fits.
- Leave out customer names, emails, phone numbers, addresses and card numbers.
- Use null for anything you can't read.`;

const round2 = (n: number) => Math.round(n * 100) / 100;
const asNum = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(/[$,\s]/g, "")) : Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
};
const asStr = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 300) : null;
};

/** Accepts YYYY-MM-DD or M/D/YY(YY) or M-D-YYYY; returns YYYY-MM-DD or null. */
export function normalizeDate(v: unknown): string | null {
  const s = asStr(v);
  if (!s) return null;
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (us) [m, d, y] = [Number(us[1]), Number(us[2]), Number(us[3].length === 2 ? `20${us[3]}` : us[3])];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || y < 1950 || y > 2100) return null;
  return dt.toISOString().slice(0, 10);
}

export function normalizeInvoice(raw: unknown): ExtractedInvoice {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lines: InvoiceLine[] = (Array.isArray(r.lines) ? r.lines : [])
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => {
      const quantity = asNum(l.quantity) ?? 1;
      let unitPrice = asNum(l.unitPrice);
      const amount = asNum(l.amount);
      if (unitPrice == null) unitPrice = amount != null && quantity ? amount / quantity : 0;
      return {
        kind: l.kind === "labor" || l.kind === "fee" ? l.kind : "part",
        partNumber: asStr(l.partNumber),
        description: asStr(l.description) ?? "Item",
        quantity: round2(quantity),
        unitPrice: round2(unitPrice),
        amount: round2(amount ?? quantity * unitPrice),
      } as InvoiceLine;
    })
    .slice(0, 200);
  const category = LOG_CATEGORY_VALUES.find((c) => c === r.category) ?? null;
  const total = asNum(r.total);
  const hours = asNum(r.engineHours);
  return {
    shop: asStr(r.shop),
    invoiceNumber: asStr(r.invoiceNumber),
    date: normalizeDate(r.date),
    boat: asStr(r.boat),
    engineHours: hours != null && hours >= 0 && hours < 100000 ? Math.round(hours) : null,
    title: asStr(r.title) ?? (asStr(r.shop) ? `Service at ${asStr(r.shop)}` : "Service"),
    category,
    laborHours: asNum(r.laborHours),
    lines,
    tax: asNum(r.tax),
    total: total != null ? round2(total) : null,
  };
}

/** Sum of the lines plus tax, next to the stated total, so the review screen can flag a misread. */
export function invoiceCheck(inv: ExtractedInvoice): { computed: number; difference: number | null } {
  const computed = round2(inv.lines.reduce((s, l) => s + l.amount, 0) + (inv.tax ?? 0));
  return { computed, difference: inv.total != null ? round2(inv.total - computed) : null };
}

export function invoiceToLogLines(inv: Pick<ExtractedInvoice, "lines">): LogLine[] {
  return inv.lines.map((l) => ({
    kind: l.kind,
    description: l.partNumber ? `${l.description} (${l.partNumber})` : l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
  }));
}

// ── Splitting one invoice into several log entries ───────────────────────────

export interface InvoiceSplit {
  title: string;
  category: InvoiceCategory | null;
}

export interface SplitEntry extends InvoiceSplit {
  lines: InvoiceLine[];
  cost: number;
  laborHours: number | null;
}

/**
 * Turn one invoice into one entry per split. `assignment[i]` is the split index for line i.
 * Tax, and any gap between the lines and the amount paid, are shared out in proportion to
 * each split's lines, so the entries always add up to exactly what was paid.
 */
export function splitInvoice(inv: ExtractedInvoice, splits: InvoiceSplit[], assignment: number[]): SplitEntry[] {
  const paid = inv.total ?? invoiceCheck(inv).computed;
  const groups = splits.map((s, gi) => ({
    ...s,
    lines: inv.lines.filter((_, li) => (assignment[li] ?? 0) === gi),
  }));
  const used = groups.filter((g) => g.lines.length > 0);
  if (used.length === 0) return [];
  if (used.length === 1) {
    return [{ ...used[0], cost: round2(paid), laborHours: inv.laborHours }];
  }
  const sums = used.map((g) => g.lines.reduce((s, l) => s + l.amount, 0));
  const all = sums.reduce((a, b) => a + b, 0);
  let left = round2(paid);
  return used.map((g, i) => {
    const last = i === used.length - 1;
    const cost = last ? left : round2(all > 0 ? (paid * sums[i]) / all : paid / used.length);
    left = round2(left - cost);
    const hours = g.lines.filter((l) => l.kind === "labor").reduce((s, l) => s + l.quantity, 0);
    return { ...g, cost, laborHours: hours > 0 ? round2(hours) : null };
  });
}
