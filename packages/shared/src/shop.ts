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
  /** The boat on file this order is for (shop_boats). Older orders carry only the label. */
  boatId?: string | null;
  projectId?: string | null;
  assignedTo: string;
  bay: string;
  scheduledStart: string | null; // ISO
  scheduledEnd: string | null; // ISO
  engineHours: number | null;
  taxRate: number; // percent, applied to parts only
  completedAt: string | null;
  exportedAt: string | null;
  /** Billing: invoice sent to the customer, and payment received. */
  invoicedAt?: string | null;
  paidAt?: string | null;
  paymentMethod?: string;
  createdAt: string;
  lines: WorkOrderLine[];
}

export const PAYMENT_METHODS = ["Card", "Check", "Cash", "ACH / wire", "Other"] as const;

/** What the shop still needs to do to get paid for this order. */
export function billingStep(o: Pick<WorkOrder, "status" | "paidAt" | "invoicedAt">): "not-done" | "invoice" | "collect" | "paid" {
  if (o.paidAt) return "paid";
  if (o.status === "invoiced" || o.invoicedAt) return "collect";
  if (o.status === "completed") return "invoice";
  return "not-done";
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

// ── Today: what needs the shop now ───────────────────────────────────────────

export type AlertTone = "urgent" | "warn" | "info" | "good";
export type ShopTab = "orders" | "schedule" | "inventory" | "parts" | "quickbooks" | "settings";

export interface ShopAlert {
  id: string;
  tone: AlertTone;
  text: string;
  action: { label: string; tab: ShopTab; workOrderId?: string };
}

const OPEN_STATUSES: WorkOrderStatus[] = ["scheduled", "in-progress", "waiting-parts"];

/** The short "needs you now" list for the top of the vendor home page. */
export function shopAlerts(input: {
  orders: WorkOrder[];
  shipments: PartsShipment[];
  inventory: InventoryItem[];
  wonJobsNotOnBoard?: number;
  coiExpiry?: string | null; // YYYY-MM-DD
  today?: Date;
}): ShopAlert[] {
  const today = input.today ?? new Date();
  const todayKey = ymd(today);
  const alerts: ShopAlert[] = [];
  const byId = new Map(input.orders.map((o) => [o.id, o]));

  const conflicts = scheduleConflicts(input.orders).filter(([a, b]) => {
    const oa = byId.get(a);
    const ob = byId.get(b);
    return (oa && occupiesDay(oa, todayKey)) || (ob && occupiesDay(ob, todayKey));
  });
  for (const [a, b] of conflicts) {
    const oa = byId.get(a)!;
    const ob = byId.get(b)!;
    const where = oa.bay && oa.bay === ob.bay ? oa.bay : oa.assignedTo;
    alerts.push({
      id: `conflict-${a}-${b}`,
      tone: "urgent",
      text: `${oa.number} and ${ob.number} are double-booked${where ? ` (${where})` : ""}`,
      action: { label: "Fix schedule", tab: "schedule" },
    });
  }

  for (const s of input.shipments) {
    if (!s.receivedAt && s.status === "exception") {
      alerts.push({
        id: `ship-${s.id}`,
        tone: "urgent",
        text: `Delivery problem: ${s.description || "shipment"}${s.supplier ? ` from ${s.supplier}` : ""}${s.boatLabel ? ` for ${s.boatLabel}` : ""}`,
        action: { label: "Call supplier", tab: "parts" },
      });
    }
  }

  for (const o of input.orders) {
    if (o.status !== "waiting-parts") continue;
    const p = partsProgress(o.id, input.shipments);
    if (p.total > 0 && p.open === 0) {
      alerts.push({
        id: `ready-${o.id}`,
        tone: "good",
        text: `${o.number} is ready to start: all parts are in${o.boatLabel ? ` for ${o.boatLabel}` : ""}`,
        action: { label: "Start job", tab: "orders", workOrderId: o.id },
      });
    }
  }

  if (input.wonJobsNotOnBoard) {
    const n = input.wonJobsNotOnBoard;
    alerts.push({
      id: "won-jobs",
      tone: "info",
      text: `${n} job${n === 1 ? "" : "s"} you won on Bosun ${n === 1 ? "isn't" : "aren't"} on the board yet`,
      action: { label: "Schedule", tab: "orders" },
    });
  }

  const unbilled = input.orders.filter((o) => billingStep(o) === "invoice");
  if (unbilled.length) {
    const sum = unbilled.reduce((t, o) => t + workOrderTotals(o.lines, o.taxRate).total, 0);
    alerts.push({
      id: "unbilled",
      tone: "warn",
      text: `${unbilled.length} completed job${unbilled.length === 1 ? "" : "s"} ($${Math.round(sum).toLocaleString("en-US")}) not invoiced yet`,
      action: { label: "Invoice", tab: "orders" },
    });
  }
  const owed = input.orders.filter((o) => billingStep(o) === "collect");
  if (owed.length) {
    const sum = owed.reduce((t, o) => t + workOrderTotals(o.lines, o.taxRate).total, 0);
    alerts.push({
      id: "unpaid",
      tone: "info",
      text: `${owed.length} invoice${owed.length === 1 ? "" : "s"} ($${Math.round(sum).toLocaleString("en-US")}) waiting on payment`,
      action: { label: "Collect", tab: "orders" },
    });
  }

  const low = input.inventory.filter(isLowStock);
  if (low.length) {
    alerts.push({
      id: "low-stock",
      tone: "warn",
      text: low.length === 1 ? `${low[0].name} is at its reorder point` : `${low.length} parts are at their reorder point`,
      action: { label: "Reorder", tab: "inventory" },
    });
  }

  if (input.coiExpiry) {
    const days = Math.round((Date.parse(`${input.coiExpiry}T12:00:00`) - Date.parse(`${todayKey}T12:00:00`)) / 86400_000);
    if (days <= 30) {
      alerts.push({
        id: "coi",
        tone: days < 0 ? "urgent" : "warn",
        text: days < 0 ? "Your insurance certificate has expired" : `Your insurance certificate expires in ${days} day${days === 1 ? "" : "s"}`,
        action: { label: "Upload COI", tab: "settings" },
      });
    }
  }

  const rank: Record<AlertTone, number> = { urgent: 0, good: 1, warn: 2, info: 3 };
  return alerts.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ── New jobs framed as schedule fit ──────────────────────────────────────────

export interface OpenSlot {
  day: string; // YYYY-MM-DD
  bay: string;
}

/** Bay-days with nothing booked, over the next `days` days (Sundays skipped). */
export function openSlots(orders: WorkOrder[], bays: string[], from: Date = new Date(), days = 10): OpenSlot[] {
  const active = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const out: OpenSlot[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 1; i <= days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === 0) continue;
    const key = ymd(d);
    for (const bay of bays) {
      if (!active.some((o) => o.bay === bay && occupiesDay(o, key))) out.push({ day: key, bay });
    }
  }
  return out;
}

const STOPWORDS = new Set([
  "with", "and", "the", "for", "from", "needs", "need", "boat", "service", "replace",
  "repair", "check", "full", "new", "old", "both", "twin", "single", "annual",
  "replacement", "replaced", "install", "installation", "installed", "upgrade", "inspection",
  "cleaning", "clean", "removal", "remove", "rebuild", "panel", "side", "rear", "front", "port",
  "starboard", "work", "job", "parts", "part",
]);

function keywords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

export interface RfpFit {
  slot: OpenSlot | null;
  pastJobs: number;
  score: number;
}

/** How well an open job fits this shop: earliest open slot and similar past work. */
export function rfpFit(
  rfp: { title: string; category?: string | null; haulOutRequired?: boolean },
  orders: WorkOrder[],
  slots: OpenSlot[],
  from: Date = new Date()
): RfpFit {
  const wanted = keywords(`${rfp.title} ${rfp.category ?? ""}`);
  const pastJobs = orders.filter((o) => {
    if (o.status !== "completed" && o.status !== "invoiced") return false;
    const k = keywords(o.title);
    for (const w of wanted) if (k.has(w)) return true;
    return false;
  }).length;
  const haulBays = slots.filter((s) => /haul|lift|yard/i.test(s.bay));
  const pool = rfp.haulOutRequired && haulBays.length ? haulBays : slots;
  const slot = pool[0] ?? null;
  const soon = slot ? Math.max(0, 10 - Math.round((Date.parse(`${slot.day}T12:00:00`) - from.getTime()) / 86400_000)) : 0;
  return { slot, pastJobs, score: pastJobs * 3 + soon };
}

// ── Tech view: parts to pull for a job ───────────────────────────────────────

export interface PullItem {
  description: string;
  quantity: number;
  bin: string;
  inStock: number | null;
}

export function pullList(order: Pick<WorkOrder, "lines">, inventory: InventoryItem[]): PullItem[] {
  const byId = new Map(inventory.map((i) => [i.id, i]));
  return order.lines
    .filter((l) => l.kind === "part")
    .map((l) => {
      const item = l.inventoryItemId ? byId.get(l.inventoryItemId) : undefined;
      return {
        description: item?.name ?? l.description,
        quantity: Number(l.quantity) || 0,
        bin: item?.binLocation || (item ? "" : "Special order"),
        inStock: item ? item.qtyOnHand : null,
      };
    })
    .sort((a, b) => a.bin.localeCompare(b.bin));
}

/* ── Quick search: boats, customers and work orders ─────────────────────── */

export interface ShopSearchHit {
  kind: "customer" | "boat" | "order";
  /** What to show. */
  label: string;
  /** Secondary line. */
  detail: string;
  /** The text to filter the work-order list by (customers and boats). */
  query: string;
  /** The order to open (orders only). */
  order?: WorkOrder;
  score: number;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchScore(hay: string, needle: string): number {
  const h = norm(hay);
  if (!h || !needle) return 0;
  if (h === needle) return 100;
  if (h.startsWith(needle)) return 80;
  if (h.split(" ").some((w) => w.startsWith(needle))) return 60;
  if (h.includes(needle)) return 40;
  // every word of the query appears somewhere (e.g. "grady 336")
  const words = needle.split(" ");
  if (words.length > 1 && words.every((w) => h.includes(w))) return 50;
  return 0;
}

/**
 * Finds customers, boats and work orders matching the query across the shop's work orders
 * and parts shipments (shipments can name boats that have no work order yet).
 */
export function searchShop(query: string, orders: WorkOrder[], shipments: PartsShipment[] = [], limit = 6): ShopSearchHit[] {
  const needle = norm(query);
  if (needle.length < 2) return [];

  const customers = new Map<string, { score: number; boats: Set<string>; orders: number; latest: string }>();
  const boats = new Map<string, { score: number; customer: string; orders: number; latest: string }>();
  const hits: ShopSearchHit[] = [];

  for (const o of orders) {
    const c = o.customerName.trim();
    if (c) {
      const s = matchScore(c, needle);
      const cur = customers.get(c) ?? { score: 0, boats: new Set<string>(), orders: 0, latest: "" };
      cur.score = Math.max(cur.score, s);
      if (o.boatLabel) cur.boats.add(o.boatLabel);
      cur.orders += 1;
      cur.latest = cur.latest > o.createdAt ? cur.latest : o.createdAt;
      customers.set(c, cur);
    }
    const b = o.boatLabel.trim();
    if (b) {
      const s = matchScore(b, needle);
      const cur = boats.get(b) ?? { score: 0, customer: c, orders: 0, latest: "" };
      cur.score = Math.max(cur.score, s);
      cur.orders += 1;
      cur.latest = cur.latest > o.createdAt ? cur.latest : o.createdAt;
      boats.set(b, cur);
    }
    const os = Math.max(matchScore(o.number, needle), matchScore(o.title, needle) - 10);
    if (os > 0) {
      hits.push({
        kind: "order",
        label: `${o.number} · ${o.title}`,
        detail: [o.boatLabel || o.customerName, o.assignedTo].filter(Boolean).join(" · "),
        query: o.number,
        order: o,
        score: os,
      });
    }
  }
  for (const s of shipments) {
    const b = s.boatLabel.trim();
    if (b && !boats.has(b)) {
      const sc = matchScore(b, needle);
      if (sc > 0) boats.set(b, { score: sc, customer: s.customerName, orders: 0, latest: "" });
    }
    const c = s.customerName.trim();
    if (c && !customers.has(c)) {
      const sc = matchScore(c, needle);
      if (sc > 0) customers.set(c, { score: sc, boats: new Set(b ? [b] : []), orders: 0, latest: "" });
    }
  }

  for (const [name, c] of customers) {
    if (c.score === 0) continue;
    const boatsText = [...c.boats].slice(0, 2).join(", ");
    hits.push({
      kind: "customer",
      label: name,
      detail: [boatsText, c.orders ? `${c.orders} work order${c.orders === 1 ? "" : "s"}` : "parts only"].filter(Boolean).join(" · "),
      query: name,
      score: c.score + 5,
    });
  }
  for (const [label, b] of boats) {
    if (b.score === 0) continue;
    hits.push({
      kind: "boat",
      label,
      detail: [b.customer, b.orders ? `${b.orders} work order${b.orders === 1 ? "" : "s"}` : "parts only"].filter(Boolean).join(" · "),
      query: label,
      score: b.score + 3,
    });
  }

  return hits.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, limit);
}


/* ── Customers and boats on file ────────────────────────────────────────── */

export interface ShopCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface ShopBoat {
  id: string;
  customerId: string;
  /** Nickname painted on the transom, if any. */
  name: string;
  year: number | null;
  make: string;
  model: string;
  /** Free text: "Twin Yamaha F300", "Volvo D6-370". */
  engine: string;
  hullId: string;
  /** Where she lives: slip, dry stack, trailer. */
  slip: string;
  createdAt: string;
}

/** "2021 Grady-White Canyon 336 · Reel Therapy": the label work orders and QuickBooks carry. */
export function boatLabel(b: Pick<ShopBoat, "name" | "year" | "make" | "model">): string {
  const spec = [b.year, b.make, b.model].filter(Boolean).join(" ").trim();
  if (spec && b.name) return `${spec} · ${b.name}`;
  return spec || b.name;
}

const TWO_WORD_MAKES = [
  "Sea Ray", "Boston Whaler", "Grady-White", "Chris-Craft", "Sea Hunt", "Sea Fox", "Sea Pro", "Key West", "Cape Horn",
  "Sea Hunter", "Everglades Boats", "Carolina Skiff", "Bennington", "Sun Tracker", "Four Winns", "Monterey", "Regal",
  "Jupiter Marine", "Palm Beach", "Hinckley", "Mako", "Nautique", "Malibu", "Pathfinder", "Hewes", "Maverick",
  "Yellowfin", "Invincible", "Contender", "Intrepid", "Hatteras", "Viking", "Bertram", "Azimut", "Sunseeker", "Princess",
  "Beneteau", "Jeanneau", "Lagoon", "Leopard", "Fountaine Pajot", "Riviera", "Tiara", "Pursuit", "Scout", "Robalo",
  "Cobia", "Sportsman", "Parker", "Edgewater", "Freeman", "SeaVee", "Blackfin", "Formula", "Cruisers Yachts",
  "Carver", "Meridian", "Silverton", "Mainship", "Grand Banks", "Back Cove", "Sabre", "MJM", "Hunt", "Zodiac", "Cobalt",
];

/** Best-effort split of a free-text boat label into the fields a boat on file has. */
export function parseBoatLabel(label: string): Pick<ShopBoat, "name" | "year" | "make" | "model" | "hullId"> {
  const [specRaw, ...rest] = label.split("·").map((s) => s.trim());
  let name = rest.join(" · ");
  let hullId = "";
  const hull = name.match(/^(?:hull|hin)\s*#?\s*([A-Z0-9-]{6,})$/i);
  if (hull) {
    hullId = hull[1];
    name = "";
  }
  let spec = specRaw ?? "";
  let year: number | null = null;
  const y = spec.match(/^((?:19|20)\d{2})\s+(.*)$/);
  if (y) {
    year = Number(y[1]);
    spec = y[2];
  }
  let make = "";
  let model = spec;
  const two = TWO_WORD_MAKES.find((m) => spec.toLowerCase().startsWith(m.toLowerCase() + " ") || spec.toLowerCase() === m.toLowerCase());
  if (two) {
    make = two;
    model = spec.slice(two.length).trim();
  } else {
    const [first, ...others] = spec.split(/\s+/);
    make = first ?? "";
    model = others.join(" ");
  }
  return { name, year, make, model, hullId };
}

/**
 * Customers and boats implied by what's already on the board, for shops that started before
 * the registry existed (and for the demo). One customer per distinct name, one boat per label.
 */
export function deriveRegistry(
  orders: Pick<WorkOrder, "customerName" | "customerEmail" | "boatLabel" | "createdAt">[],
  shipments: Pick<PartsShipment, "customerName" | "boatLabel" | "createdAt">[] = []
): { customers: ShopCustomer[]; boats: ShopBoat[] } {
  const customers = new Map<string, ShopCustomer>();
  const boats = new Map<string, ShopBoat>();
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const rows = [
    ...orders.map((o) => ({ customerName: o.customerName, email: o.customerEmail, boatLabel: o.boatLabel, createdAt: o.createdAt })),
    ...shipments.map((s) => ({ customerName: s.customerName, email: "", boatLabel: s.boatLabel, createdAt: s.createdAt })),
  ];
  for (const r of rows) {
    const cname = r.customerName.trim();
    if (!cname) continue;
    const ckey = slug(cname);
    const c = customers.get(ckey) ?? { id: `cust-${ckey}`, name: cname, email: "", phone: "", notes: "", createdAt: r.createdAt };
    if (!c.email && r.email) c.email = r.email;
    customers.set(ckey, c);
    const blabel = r.boatLabel.trim();
    if (!blabel) continue;
    const bkey = `${ckey}/${slug(blabel)}`;
    if (!boats.has(bkey)) {
      boats.set(bkey, { id: `boat-${slug(blabel)}`, customerId: c.id, ...parseBoatLabel(blabel), engine: "", slip: "", createdAt: r.createdAt });
    }
  }
  return { customers: [...customers.values()], boats: [...boats.values()] };
}
