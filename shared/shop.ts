// Shop OS: pure logic shared by the vendor shop UI and the inbound-email route.
// Work orders, inventory, inbound parts tracking, and QuickBooks export.

export type WorkOrderStatus =
  | "scheduled"
  | "in-progress"
  | "waiting-parts"
  | "completed"
  | "invoiced";

export const WORK_ORDER_STATUSES: { value: WorkOrderStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In progress" },
  { value: "waiting-parts", label: "Waiting on parts" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
];

export type LineKind = "labor" | "part" | "fee";

export interface WorkOrderLine {
  id?: string;
  kind: LineKind;
  description: string;
  quantity: number;
  unitPrice: number;
  inventoryItemId?: string | null;
}

export interface WorkOrder {
  id: string;
  number: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  customerName: string;
  customerEmail: string;
  boatLabel: string;
  projectId?: string | null;
  assignedTo: string;
  bay: string;
  scheduledStart: string | null; // ISO
  scheduledEnd: string | null; // ISO
  engineHours: number | null;
  taxRate: number; // percent, applied to parts only
  completedAt: string | null;
  exportedAt: string | null;
  createdAt: string;
  lines: WorkOrderLine[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  binLocation: string;
  qtyOnHand: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  updatedAt: string;
}

export type Carrier = "UPS" | "FedEx" | "USPS" | "DHL" | "Other";

export type ShipmentStatus =
  | "ordered"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "exception";

export const SHIPMENT_STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: "ordered", label: "Ordered" },
  { value: "shipped", label: "In transit" },
  { value: "out-for-delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "exception", label: "Exception" },
];

export interface PartsShipment {
  id: string;
  supplier: string;
  description: string;
  carrier: Carrier;
  trackingNumber: string;
  status: ShipmentStatus;
  eta: string | null; // YYYY-MM-DD
  workOrderId: string | null;
  /** Boat the part was ordered for. Empty = shop stock. Copied from the work order when linked. */
  boatLabel: string;
  customerName: string;
  inventoryItemId: string | null;
  quantity: number;
  source: "manual" | "email";
  emailSubject: string | null;
  receivedAt: string | null;
  createdAt: string;
}

// ── Money ────────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineAmount(line: Pick<WorkOrderLine, "quantity" | "unitPrice">): number {
  return round2((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0));
}

export interface WorkOrderTotals {
  labor: number;
  parts: number;
  fees: number;
  subtotal: number;
  tax: number;
  total: number;
  laborHours: number;
}

export function workOrderTotals(
  lines: WorkOrderLine[],
  taxRatePercent = 0
): WorkOrderTotals {
  let labor = 0;
  let parts = 0;
  let fees = 0;
  let laborHours = 0;
  for (const l of lines) {
    const amt = lineAmount(l);
    if (l.kind === "labor") {
      labor += amt;
      laborHours += Number(l.quantity) || 0;
    } else if (l.kind === "part") parts += amt;
    else fees += amt;
  }
  const tax = round2(parts * ((Number(taxRatePercent) || 0) / 100));
  const subtotal = round2(labor + parts + fees);
  return {
    labor: round2(labor),
    parts: round2(parts),
    fees: round2(fees),
    subtotal,
    tax,
    total: round2(subtotal + tax),
    laborHours: round2(laborHours),
  };
}

// ── Inventory ────────────────────────────────────────────────────────────────

export function isLowStock(item: Pick<InventoryItem, "qtyOnHand" | "reorderPoint">): boolean {
  return item.qtyOnHand <= item.reorderPoint;
}

/**
 * Net change in inventory caused by replacing `before` part lines with `after`.
 * Returns itemId → delta (negative = taken from stock).
 */
export function inventoryDelta(
  before: WorkOrderLine[],
  after: WorkOrderLine[]
): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (lines: WorkOrderLine[], sign: number) => {
    for (const l of lines) {
      if (l.kind !== "part" || !l.inventoryItemId) continue;
      out[l.inventoryItemId] = (out[l.inventoryItemId] ?? 0) + sign * (Number(l.quantity) || 0);
    }
  };
  add(before, 1);
  add(after, -1);
  for (const k of Object.keys(out)) if (out[k] === 0) delete out[k];
  return out;
}

// ── Schedule ─────────────────────────────────────────────────────────────────

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function toLocalDateKey(iso: string): string {
  return ymd(new Date(iso));
}

/** Monday-first week containing `anchor`, as local YYYY-MM-DD keys. */
export function weekDays(anchor: Date): string[] {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return ymd(x);
  });
}

/** True when the work order occupies the given local day. */
export function occupiesDay(order: Pick<WorkOrder, "scheduledStart" | "scheduledEnd">, dayKey: string): boolean {
  if (!order.scheduledStart) return false;
  const start = toLocalDateKey(order.scheduledStart);
  const end = order.scheduledEnd ? toLocalDateKey(order.scheduledEnd) : start;
  return dayKey >= start && dayKey <= end;
}

/** Pairs of work orders that overlap in time in the same bay or with the same tech. */
export function scheduleConflicts(orders: WorkOrder[]): [string, string][] {
  const active = orders.filter(
    (o) => o.scheduledStart && o.status !== "completed" && o.status !== "invoiced"
  );
  const out: [string, string][] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const sameBay = a.bay && a.bay === b.bay;
      const sameTech = a.assignedTo && a.assignedTo === b.assignedTo;
      if (!sameBay && !sameTech) continue;
      const aS = Date.parse(a.scheduledStart!);
      const aE = a.scheduledEnd ? Date.parse(a.scheduledEnd) : aS + 3600_000;
      const bS = Date.parse(b.scheduledStart!);
      const bE = b.scheduledEnd ? Date.parse(b.scheduledEnd) : bS + 3600_000;
      if (aS < bE && bS < aE) out.push([a.id, b.id]);
    }
  }
  return out;
}

// ── Shipping email parsing ───────────────────────────────────────────────────

export interface ParsedShipment {
  carrier: Carrier;
  trackingNumber: string;
}

export interface ParsedShippingEmail {
  shipments: ParsedShipment[];
  status: ShipmentStatus;
  eta: string | null;
  orderNumber: string | null;
  supplier: string | null;
  /** Digits of a WO/PO reference the shop put on the order, e.g. "1042" from "PO: WO-1042". */
  workOrderRef: string | null;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

const KNOWN_SUPPLIERS: [RegExp, string][] = [
  [/west\s*marine/i, "West Marine"],
  [/defender/i, "Defender"],
  [/fisheries\s*supply/i, "Fisheries Supply"],
  [/marine\s*parts\s*source/i, "Marine Parts Source"],
  [/mercury/i, "Mercury Marine"],
  [/yamaha/i, "Yamaha"],
  [/volvo\s*penta/i, "Volvo Penta"],
  [/suzuki/i, "Suzuki Marine"],
  [/amazon/i, "Amazon"],
  [/jamestown\s*distributors/i, "Jamestown Distributors"],
  [/go2marine/i, "Go2Marine"],
  [/boat\s*outfitters/i, "Boat Outfitters"],
  [/crowley\s*marine/i, "Crowley Marine"],
];

export function carrierTrackingUrl(carrier: Carrier, trackingNumber: string): string | null {
  const n = encodeURIComponent(trackingNumber.replace(/\s+/g, ""));
  switch (carrier) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${n}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    default:
      return null;
  }
}

function parseEta(text: string, now: Date): string | null {
  const cue =
    /(?:estimated|expected|scheduled|arriv(?:es|ing|al)|deliver(?:y|ed by|s)?(?: date)?|eta)[^\n.]{0,40}?/i;
  // "October 7", "Oct 7, 2026", "Tue, Oct 7"
  const monthDay = new RegExp(
    cue.source + String.raw`(?:\w{3,9},?\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?`,
    "i"
  );
  const m1 = text.match(monthDay);
  if (m1) {
    const month = MONTHS.indexOf(m1[1].toLowerCase().slice(0, 3));
    const day = Number(m1[2]);
    let year = m1[3] ? Number(m1[3]) : now.getFullYear();
    if (!m1[3]) {
      // Dates more than ~2 months in the past roll to next year.
      const candidate = new Date(year, month, day);
      if (candidate.getTime() < now.getTime() - 60 * 86400_000) year += 1;
    }
    return ymd(new Date(year, month, day));
  }
  // "10/07/2026" or "10/7"
  const numeric = new RegExp(cue.source + String.raw`(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?`, "i");
  const m2 = text.match(numeric);
  if (m2) {
    let year = m2[3] ? Number(m2[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    return ymd(new Date(year, Number(m2[1]) - 1, Number(m2[2])));
  }
  return null;
}

function parseStatus(text: string): ShipmentStatus {
  const t = text.toLowerCase();
  if (/\b(delivery exception|exception|delayed|unable to deliver|return(ed)? to sender)\b/.test(t)) return "exception";
  if (/\bout for delivery\b/.test(t)) return "out-for-delivery";
  if (/\b(has been delivered|was delivered|delivered\b(?! by))/.test(t) && !/\bwill be delivered\b/.test(t)) return "delivered";
  if (/\b(shipped|on (its|the) way|in transit|tracking number|has left|label created|dispatched)\b/.test(t)) return "shipped";
  return "ordered";
}

/**
 * Extract carriers, tracking numbers, delivery status, ETA and supplier from a
 * supplier or carrier notification email. Conservative: ambiguous digit runs
 * only count when the carrier is named in the email.
 */
export function parseShippingEmail(
  subject: string,
  body: string,
  from = "",
  now: Date = new Date()
): ParsedShippingEmail {
  const text = `${subject}\n${body}`;
  const lower = `${text}\n${from}`.toLowerCase();
  const found = new Map<string, Carrier>();
  const add = (num: string, carrier: Carrier) => {
    const clean = num.replace(/[\s-]/g, "").toUpperCase();
    if (!found.has(clean)) found.set(clean, carrier);
  };

  for (const m of text.matchAll(/\b1Z[0-9A-Z]{16}\b/gi)) add(m[0], "UPS");
  for (const m of text.matchAll(/\b(9[1-5]\d{2}[\s-]?(?:\d{4}[\s-]?){4}\d{2,6})\b/g)) {
    const digits = m[1].replace(/[\s-]/g, "");
    if (digits.length >= 20 && digits.length <= 26) add(digits, "USPS");
  }
  for (const m of text.matchAll(/\b[A-Z]{2}\d{9}US\b/g)) add(m[0], "USPS");

  const mentionsFedex = lower.includes("fedex");
  const mentionsDhl = lower.includes("dhl");
  const mentionsUsps = lower.includes("usps") || lower.includes("postal service");
  if (mentionsFedex || mentionsDhl || mentionsUsps) {
    for (const m of text.matchAll(/(?:tracking|trk|track)[^\d\n]{0,25}(\d[\d\s]{8,30}\d)/gi)) {
      const digits = m[1].replace(/\s/g, "");
      if (found.has(digits)) continue;
      if (mentionsFedex && [12, 15, 20, 22].includes(digits.length)) add(digits, "FedEx");
      else if (mentionsDhl && (digits.length === 10 || digits.length === 11)) add(digits, "DHL");
      else if (mentionsUsps && digits.length >= 20 && digits.length <= 22) add(digits, "USPS");
    }
  }

  const orderMatch = text.match(/\border\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{3,20})/i);
  const orderNumber =
    orderMatch && /\d/.test(orderMatch[1]) && !found.has(orderMatch[1].toUpperCase())
      ? orderMatch[1]
      : null;

  let supplier: string | null = null;
  for (const [re, name] of KNOWN_SUPPLIERS) {
    if (re.test(from) || re.test(subject)) {
      supplier = name;
      break;
    }
  }
  if (!supplier && from) {
    const display = from.match(/^\s*"?([^"<@]+?)"?\s*</);
    if (display && !/^(ups|fedex|usps|dhl)\b/i.test(display[1])) supplier = display[1].trim();
  }

  return {
    shipments: [...found.entries()].map(([trackingNumber, carrier]) => ({ carrier, trackingNumber })),
    status: parseStatus(text),
    eta: parseEta(text, now),
    orderNumber,
    supplier,
    workOrderRef: (text.match(/\b(?:WO|PO|work\s*order)\s*(?:#|no\.?|number)?\s*[:#-]?\s*(?:WO-?)?(\d{3,7})\b/i) ?? [])[1] ?? null,
  };
}

/** The open work order a WO/PO reference on a supplier email points at. */
export function matchWorkOrderRef<T extends Pick<WorkOrder, "number" | "status">>(
  ref: string | null,
  orders: T[]
): T | null {
  if (!ref) return null;
  const hits = orders.filter((o) => o.number.replace(/\D/g, "") === ref);
  return hits.find((o) => o.status !== "invoiced") ?? hits[0] ?? null;
}

export interface PartsProgress {
  total: number;
  received: number;
  open: number;
  problems: number;
  nextEta: string | null;
}

/** How the parts ordered for one work order are coming along. */
export function partsProgress(
  workOrderId: string,
  shipments: Pick<PartsShipment, "workOrderId" | "receivedAt" | "status" | "eta">[]
): PartsProgress {
  const mine = shipments.filter((s) => s.workOrderId === workOrderId);
  const open = mine.filter((s) => !s.receivedAt);
  const etas = open.map((s) => s.eta).filter((e): e is string => !!e).sort();
  return {
    total: mine.length,
    received: mine.length - open.length,
    open: open.length,
    problems: open.filter((s) => s.status === "exception").length,
    nextEta: etas[0] ?? null,
  };
}

/** Group label for a shipment on the parts board: the boat it's for, or shop stock. */
export function shipmentBoatKey(s: Pick<PartsShipment, "workOrderId" | "boatLabel" | "customerName">): string {
  if (s.workOrderId) return `wo:${s.workOrderId}`;
  if (s.boatLabel.trim()) return `boat:${s.boatLabel.trim().toLowerCase()}`;
  return "stock";
}

const STATUS_RANK: Record<ShipmentStatus, number> = {
  ordered: 0,
  shipped: 1,
  "out-for-delivery": 2,
  exception: 3,
  delivered: 4,
};

/** Carrier emails can arrive out of order; never move a shipment backwards. */
export function advanceStatus(current: ShipmentStatus, incoming: ShipmentStatus): ShipmentStatus {
  if (current === "delivered") return current;
  if (incoming === "exception" || current === "exception") return incoming;
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current;
}

/** Pull the shop token out of `parts+TOKEN@inbound.example.com`. */
export function inboundTokenFromAddress(address: string): string | null {
  const addrs = address.split(/[,;]/);
  for (const a of addrs) {
    const m = a.match(/[A-Za-z0-9._-]+\+([A-Za-z0-9]{8,64})@/);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

// ── QuickBooks export ────────────────────────────────────────────────────────

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function mdy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export interface QuickBooksOptions {
  /** QuickBooks Products/Services names to post lines against. */
  laborItem?: string;
  partsItem?: string;
  feeItem?: string;
  termsDays?: number;
}

const QB_DEFAULTS: Required<QuickBooksOptions> = {
  laborItem: "Marine Labor",
  partsItem: "Marine Parts",
  feeItem: "Shop Fees",
  termsDays: 30,
};

function qbItem(kind: LineKind, o: Required<QuickBooksOptions>): string {
  return kind === "labor" ? o.laborItem : kind === "part" ? o.partsItem : o.feeItem;
}

function invoiceDate(o: WorkOrder): string {
  return o.completedAt ?? o.scheduledEnd ?? o.createdAt;
}

/**
 * QuickBooks Online invoice import CSV (Sales → Invoices → Import).
 * One row per line; rows sharing InvoiceNo become one invoice.
 */
export function toQuickBooksOnlineCsv(orders: WorkOrder[], opts: QuickBooksOptions = {}): string {
  const o = { ...QB_DEFAULTS, ...opts };
  const rows: (string | number)[][] = [
    [
      "InvoiceNo", "Customer", "InvoiceDate", "DueDate", "Terms", "Memo",
      "Item(Product/Service)", "ItemDescription", "ItemQuantity", "ItemRate",
      "ItemAmount", "Taxable", "TaxRate",
    ],
  ];
  for (const wo of orders) {
    const date = invoiceDate(wo);
    const memo = [wo.boatLabel, wo.title].filter(Boolean).join(" — ");
    for (const l of wo.lines) {
      rows.push([
        wo.number,
        wo.customerName || "Walk-in customer",
        mdy(date),
        mdy(addDays(date, o.termsDays)),
        `Net ${o.termsDays}`,
        memo,
        qbItem(l.kind, o),
        l.description,
        Number(l.quantity) || 0,
        (Number(l.unitPrice) || 0).toFixed(2),
        lineAmount(l).toFixed(2),
        l.kind === "part" && wo.taxRate > 0 ? "Y" : "N",
        l.kind === "part" && wo.taxRate > 0 ? `${wo.taxRate}%` : "",
      ]);
    }
  }
  return toCsv(rows);
}

/**
 * QuickBooks Desktop IIF (File → Utilities → Import → IIF Files).
 * Each invoice debits Accounts Receivable and credits income per line.
 */
export function toQuickBooksIif(orders: WorkOrder[], opts: QuickBooksOptions = {}): string {
  const o = { ...QB_DEFAULTS, ...opts };
  const clean = (s: string) => String(s ?? "").replace(/[\t\r\n]+/g, " ");
  const out: string[] = [
    "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tTERMS",
    "!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tQNTY\tPRICE\tINVITEM\tTAXABLE",
    "!ENDTRNS",
  ];
  for (const wo of orders) {
    const totals = workOrderTotals(wo.lines, wo.taxRate);
    const date = mdy(invoiceDate(wo));
    const name = clean(wo.customerName || "Walk-in customer");
    const memo = clean([wo.boatLabel, wo.title].filter(Boolean).join(" - "));
    out.push(
      ["TRNS", "INVOICE", date, "Accounts Receivable", name, totals.total.toFixed(2), wo.number, memo, `Net ${o.termsDays}`].join("\t")
    );
    for (const l of wo.lines) {
      const amt = lineAmount(l);
      out.push(
        [
          "SPL", "INVOICE", date,
          l.kind === "labor" ? "Service Income" : l.kind === "part" ? "Parts Sales" : "Other Income",
          name, (-amt).toFixed(2), wo.number, clean(l.description),
          String(-(Number(l.quantity) || 0)), (Number(l.unitPrice) || 0).toFixed(2),
          clean(qbItem(l.kind, o)), l.kind === "part" && wo.taxRate > 0 ? "Y" : "N",
        ].join("\t")
      );
    }
    if (totals.tax > 0) {
      out.push(
        ["SPL", "INVOICE", date, "Sales Tax Payable", name, (-totals.tax).toFixed(2), wo.number, "Sales tax", "", `${wo.taxRate}%`, "Sales Tax", "N"].join("\t")
      );
    }
    out.push("ENDTRNS");
  }
  return out.join("\r\n") + "\r\n";
}

/** Inventory snapshot CSV, also importable as QuickBooks Products/Services. */
export function inventoryToCsv(items: InventoryItem[]): string {
  return toCsv([
    ["Name", "SKU", "Category", "Type", "Bin", "Qty On Hand", "Reorder Point", "Purchase Cost", "Sales Price", "Supplier"],
    ...items.map((i) => [
      i.name, i.sku, i.category, "Inventory", i.binLocation, i.qtyOnHand,
      i.reorderPoint, i.unitCost.toFixed(2), i.unitPrice.toFixed(2), i.supplier,
    ]),
  ]);
}
