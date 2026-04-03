import { EngineType } from "./engineData";
import { Bid, Project } from "./projectData";
import { submitBid, vendorHasBid } from "./bidUtils";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface TemplateLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface AutoBidTemplate {
  id: string;
  vendorId: string;
  /** Human-readable name, e.g. "100-Hour Service — Mercury Verado" */
  name: string;
  /** Service category to match (e.g. "Engine Service") */
  category: string;
  /** Engine type filter — null = any */
  engineType: EngineType | null;
  /** Engine make filter — null = any */
  engineMake: string | null;
  /** Engine model keywords — if set, project title/description must contain one */
  engineModelKeywords: string[];
  /** Title keywords that must appear in the RFP (any one match = pass) */
  titleKeywords: string[];
  /** Pre-set bid message */
  message: string;
  /** Pre-set line items */
  lineItems: TemplateLineItem[];
  /** "auto" = submit bid automatically; "notify" = just flag it */
  mode: "auto" | "notify";
  /** Max concurrent auto-bids from this template (0 = unlimited) */
  maxConcurrent: number;
  /** Whether this template is currently active */
  active: boolean;
  /** How many times this template has auto-bid */
  bidCount: number;
  /** Work location preferences — empty = any */
  workLocations: ("at_marina" | "vendor_facility" | "mobile")[];
  /** Whether vendor can handle haul-out jobs */
  acceptsHaulOut: boolean;
  /** Whether vendor has marina COI on file */
  hasCOI: boolean;
  createdAt: string;
}

// ── localStorage helpers ────────────────────────────────────────────────────

const TEMPLATES_KEY = "vendor_auto_bid_templates";
const AUTOBID_LOG_KEY = "auto_bid_log";

export function getTemplates(vendorId?: string): AutoBidTemplate[] {
  try {
    const all: AutoBidTemplate[] = JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "[]");
    return vendorId ? all.filter((t) => t.vendorId === vendorId) : all;
  } catch {
    return [];
  }
}

export function saveTemplate(template: AutoBidTemplate): void {
  const all = getTemplates();
  const idx = all.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    all[idx] = template;
  } else {
    all.push(template);
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
}

export function deleteTemplate(templateId: string): void {
  const all = getTemplates().filter((t) => t.id !== templateId);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
}

export function toggleTemplateActive(templateId: string): void {
  const all = getTemplates();
  const t = all.find((t) => t.id === templateId);
  if (t) {
    t.active = !t.active;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
  }
}

// ── Matching logic ──────────────────────────────────────────────────────────

function textContainsAny(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/** Check if a template matches a given project */
export function templateMatchesProject(template: AutoBidTemplate, project: Project): boolean {
  // Category match
  if (template.category && project.category) {
    if (project.category.toLowerCase() !== template.category.toLowerCase()) return false;
  }

  // Title/description keyword match
  const searchText = `${project.title} ${project.description}`;
  if (template.titleKeywords.length > 0 && !textContainsAny(searchText, template.titleKeywords)) {
    return false;
  }

  // Engine type match (check boat propulsion string)
  if (template.engineType && project.boat?.propulsion) {
    const prop = project.boat.propulsion.toLowerCase();
    if (template.engineType === "Outboard" && !prop.includes("outboard")) return false;
    if (template.engineType === "Inboard" && !prop.includes("inboard")) return false;
    if (template.engineType === "I/O (Sterndrive)" && !prop.includes("sterndrive") && !prop.includes("i/o")) return false;
  }

  // Engine make match
  if (template.engineMake && project.boat?.propulsion) {
    if (!project.boat.propulsion.toLowerCase().includes(template.engineMake.toLowerCase())) return false;
  }

  // Engine model keywords
  if (template.engineModelKeywords.length > 0) {
    const boatText = `${project.boat?.propulsion ?? ""} ${project.title} ${project.description}`;
    if (!textContainsAny(boatText, template.engineModelKeywords)) return false;
  }

  // Work location preference
  if (template.workLocations.length > 0 && project.workLocation) {
    if (!template.workLocations.includes(project.workLocation)) return false;
  }

  // Haul-out filter: if template doesn't accept haul-out, skip haul-out projects
  if (!template.acceptsHaulOut && project.haulOutRequired) return false;

  // COI filter: if project requires marina COI and template doesn't have it
  if (project.marinaCOIRequired && !template.hasCOI) return false;

  return true;
}

// ── Auto-bid execution ──────────────────────────────────────────────────────

export interface AutoBidLogEntry {
  templateId: string;
  templateName: string;
  projectId: string;
  projectTitle: string;
  vendorId: string;
  bidId: string;
  price: number;
  timestamp: string;
  mode: "auto" | "notify";
}

function getAutoBidLog(): AutoBidLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUTOBID_LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getAutoBidLogForVendor(vendorId: string): AutoBidLogEntry[] {
  return getAutoBidLog().filter((e) => e.vendorId === vendorId);
}

/** Count how many active (non-completed) auto-bids exist for a template */
function activeAutoBidCount(templateId: string): number {
  return getAutoBidLog().filter((e) => e.templateId === templateId && e.mode === "auto").length;
}

/**
 * Run all active templates against a newly created project.
 * Returns list of auto-bids that were submitted or flagged.
 */
export function runAutoBidMatching(project: Project): AutoBidLogEntry[] {
  const allTemplates = getTemplates();
  const results: AutoBidLogEntry[] = [];
  const log = getAutoBidLog();

  for (const template of allTemplates) {
    if (!template.active) continue;
    if (!templateMatchesProject(template, project)) continue;

    // Already bid on this project?
    if (vendorHasBid(project.id, template.vendorId)) continue;

    // Check max concurrent
    if (template.maxConcurrent > 0 && activeAutoBidCount(template.id) >= template.maxConcurrent) continue;

    const bidId = `autobid_${template.id}_${Date.now()}`;
    const price = template.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const now = new Date();
    const submittedDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const expiryDate = new Date(now.getTime() + 14 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const entry: AutoBidLogEntry = {
      templateId: template.id,
      templateName: template.name,
      projectId: project.id,
      projectTitle: project.title,
      vendorId: template.vendorId,
      bidId,
      price,
      timestamp: now.toISOString(),
      mode: template.mode,
    };

    if (template.mode === "auto") {
      // Actually submit the bid
      const bid: Bid = {
        id: bidId,
        vendorName: template.vendorId,
        vendorInitials: template.vendorId
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        rating: 0,
        reviewCount: 0,
        message: `${template.message}\n\n⚡ Auto-bid from template: ${template.name}`,
        price,
        lineItems: template.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        submittedDate,
        expiryDate,
        thread: [],
        isAutoBid: true,
      };
      submitBid(project.id, bid);

      // Increment template bid count
      template.bidCount++;
      saveTemplate(template);
    }

    results.push(entry);
    log.push(entry);
  }

  localStorage.setItem(AUTOBID_LOG_KEY, JSON.stringify(log));
  return results;
}

// ── Notifications for "notify" mode ─────────────────────────────────────────

const NOTIFICATIONS_KEY = "auto_bid_notifications";

export interface AutoBidNotification {
  id: string;
  templateId: string;
  templateName: string;
  projectId: string;
  projectTitle: string;
  vendorId: string;
  price: number;
  timestamp: string;
  dismissed: boolean;
}

export function getNotifications(vendorId: string): AutoBidNotification[] {
  try {
    const all: AutoBidNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) ?? "[]");
    return all.filter((n) => n.vendorId === vendorId && !n.dismissed);
  } catch {
    return [];
  }
}

export function dismissNotification(notificationId: string): void {
  try {
    const all: AutoBidNotification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) ?? "[]");
    const n = all.find((n) => n.id === notificationId);
    if (n) {
      n.dismissed = true;
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
    }
  } catch {}
}

// ── Demo seed data ──────────────────────────────────────────────────────────

const DEMO_TEMPLATES_KEY = "auto_bid_templates_seeded";

export function seedDemoTemplates(): void {
  if (localStorage.getItem(DEMO_TEMPLATES_KEY)) return;

  const templates: AutoBidTemplate[] = [
    {
      id: "tpl_mm_100hr_verado",
      vendorId: "MarineMax",
      name: "100-Hour Service — Mercury Verado",
      category: "Engine Service",
      engineType: "Outboard",
      engineMake: "Mercury",
      engineModelKeywords: ["verado", "100-hour", "100 hour"],
      titleKeywords: ["100-hour", "100 hour", "annual service", "engine service"],
      message: "MarineMax is a Mercury-certified service center. Our 100-hour service includes full oil & filter change, gear lube, impeller inspection, anodes check, and a 27-point safety inspection. All OEM parts included.",
      lineItems: [
        { description: "100-Hour Service Labor (per engine)", quantity: 1, unitPrice: 450 },
        { description: "Mercury OEM Oil & Filter Kit", quantity: 1, unitPrice: 89 },
        { description: "Gear Lube Change", quantity: 1, unitPrice: 45 },
        { description: "Impeller Inspection", quantity: 1, unitPrice: 35 },
        { description: "27-Point Safety Check", quantity: 1, unitPrice: 0 },
      ],
      mode: "auto",
      maxConcurrent: 5,
      active: true,
      bidCount: 3,
      workLocations: ["at_marina", "vendor_facility"],
      acceptsHaulOut: false,
      hasCOI: true,
      createdAt: "2026-01-15T10:00:00Z",
    },
    {
      id: "tpl_mm_100hr_yamaha",
      vendorId: "MarineMax",
      name: "100-Hour Service — Yamaha 4-Stroke",
      category: "Engine Service",
      engineType: "Outboard",
      engineMake: "Yamaha",
      engineModelKeywords: ["yamaha", "100-hour", "100 hour"],
      titleKeywords: ["100-hour", "100 hour", "annual service", "engine service"],
      message: "MarineMax is an authorized Yamaha service dealer. Our 100-hour service follows Yamaha's factory maintenance schedule, with OEM parts and certified technicians.",
      lineItems: [
        { description: "100-Hour Service Labor (per engine)", quantity: 1, unitPrice: 425 },
        { description: "Yamaha OEM Oil & Filter Kit", quantity: 1, unitPrice: 78 },
        { description: "Gear Lube Change", quantity: 1, unitPrice: 40 },
        { description: "Fuel Filter Replacement", quantity: 1, unitPrice: 32 },
        { description: "Inspection & Report", quantity: 1, unitPrice: 0 },
      ],
      mode: "auto",
      maxConcurrent: 5,
      active: true,
      bidCount: 1,
      workLocations: ["at_marina", "vendor_facility"],
      acceptsHaulOut: false,
      hasCOI: true,
      createdAt: "2026-01-15T10:30:00Z",
    },
    {
      id: "tpl_mm_winterize",
      vendorId: "MarineMax",
      name: "Winterization — Outboard",
      category: "Engine Service",
      engineType: "Outboard",
      engineMake: null,
      engineModelKeywords: [],
      titleKeywords: ["winterize", "winterization", "winter prep", "lay-up"],
      message: "Full winterization service: engine fogging, fuel stabilizer, coolant flush, battery disconnect, and shrink-wrap available. Protect your investment over the off-season.",
      lineItems: [
        { description: "Winterization Labor (per engine)", quantity: 1, unitPrice: 275 },
        { description: "Fogging Oil & Stabilizer", quantity: 1, unitPrice: 35 },
        { description: "Coolant Flush", quantity: 1, unitPrice: 45 },
      ],
      mode: "notify",
      maxConcurrent: 0,
      active: true,
      bidCount: 0,
      workLocations: ["at_marina", "vendor_facility"],
      acceptsHaulOut: false,
      hasCOI: true,
      createdAt: "2026-02-01T09:00:00Z",
    },
    {
      id: "tpl_bs_electronics",
      vendorId: "Boat Specialists",
      name: "Electronics Install — Garmin/Simrad",
      category: "Electronics & AV",
      engineType: null,
      engineMake: null,
      engineModelKeywords: [],
      titleKeywords: ["garmin", "simrad", "chartplotter", "fishfinder", "mfd", "radar", "electronics"],
      message: "NMEA-certified marine electronics installer with 15+ years experience. We handle full system design, wiring, and commissioning for Garmin and Simrad systems.",
      lineItems: [
        { description: "Electronics Installation Labor (hourly)", quantity: 4, unitPrice: 125 },
        { description: "Wiring & Connectors", quantity: 1, unitPrice: 85 },
        { description: "System Commissioning & Testing", quantity: 1, unitPrice: 150 },
      ],
      mode: "notify",
      maxConcurrent: 3,
      active: true,
      bidCount: 2,
      workLocations: ["at_marina", "vendor_facility"],
      acceptsHaulOut: false,
      hasCOI: true,
      createdAt: "2026-01-20T14:00:00Z",
    },
  ];

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  localStorage.setItem(DEMO_TEMPLATES_KEY, "true");
}

// ── Available categories (must stay in sync with HeroSection) ───────────────

export const SERVICE_CATEGORIES = [
  "Engine Service",
  "Detailing & Waxing",
  "Decking & Upholstery",
  "Electrical",
  "Electronics & AV",
  "Hull & Gelcoat",
  "Mechanical",
  "Other / Custom",
];
