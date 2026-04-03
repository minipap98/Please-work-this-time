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
  /** Auto-generated from engine + service selection */
  name: string;

  // ── Exact matching fields ──────────────────────────────────
  /** Engine type — required */
  engineType: EngineType;
  /** Engine make — required (e.g. "Mercury") */
  engineMake: string;
  /** Engine model — required (e.g. "Verado 300 (2021–present)") */
  engineModel: string;
  /** Service ID from engineServices.ts (e.g. "out-100hr") */
  serviceId: string;
  /** Service name for display (e.g. "100-Hour Service") */
  serviceName: string;

  // ── Bid content ────────────────────────────────────────────
  /** Pre-set bid message */
  message: string;
  /** Pre-set line items */
  lineItems: TemplateLineItem[];

  // ── Behavior ───────────────────────────────────────────────
  /** "auto" = submit bid automatically; "notify" = just flag it */
  mode: "auto" | "notify";
  /** Max concurrent auto-bids from this template (0 = unlimited) */
  maxConcurrent: number;
  /** Whether this template is currently active */
  active: boolean;
  /** How many times this template has auto-bid */
  bidCount: number;

  // ── Logistics filters ──────────────────────────────────────
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

// ── Exact matching logic ────────────────────────────────────────────────────

/**
 * Check if a template matches a given project.
 * Matching is EXACT on engine type + make + model + service type.
 */
export function templateMatchesProject(template: AutoBidTemplate, project: Project): boolean {
  // Must be an engine service category
  if (project.category && project.category.toLowerCase() !== "engine service") return false;

  // Must have boat/propulsion info to match against
  if (!project.boat?.propulsion) return false;

  const propulsion = project.boat.propulsion.toLowerCase();
  const title = project.title.toLowerCase();
  const description = project.description.toLowerCase();
  const fullText = `${propulsion} ${title} ${description}`;

  // Exact engine make match (case-insensitive)
  if (!fullText.includes(template.engineMake.toLowerCase())) return false;

  // Engine model match — extract the model name part (before the year range in parens)
  const modelName = template.engineModel.replace(/\s*\([\d–\-]+.*?\)$/, "").toLowerCase();
  if (!fullText.includes(modelName)) return false;

  // Service match — check for the service name in title/description
  const serviceName = template.serviceName.toLowerCase();
  if (!fullText.includes(serviceName)) {
    // Also check common variations
    const serviceAliases: Record<string, string[]> = {
      "100-hour service": ["100 hour", "100-hour", "100hr", "annual service"],
      "annual service / winterization prep": ["annual service", "annual maintenance"],
      "oil & filter change": ["oil change", "oil and filter"],
      "lower unit / gear lube service": ["gear lube", "lower unit"],
      "water pump / impeller replacement": ["impeller", "water pump"],
      "winterization": ["winterize", "winter prep", "lay-up", "layup"],
      "de-winterization / spring commissioning": ["de-winterize", "dewinterize", "spring commissioning", "spring commission"],
      "250-hour service": ["250 hour", "250-hour", "250hr"],
      "500-hour / major service": ["500 hour", "500-hour", "500hr", "major service"],
      "outdrive service": ["outdrive", "sterndrive service"],
      "bellows replacement": ["bellows"],
      "gimbal bearing replacement": ["gimbal bearing", "gimbal"],
      "raw water pump / impeller service": ["impeller", "raw water pump"],
      "heat exchanger service": ["heat exchanger"],
      "engine alignment": ["alignment", "shaft alignment"],
    };

    const aliases = serviceAliases[serviceName] ?? [];
    const hasAlias = aliases.some((alias) => fullText.includes(alias));
    if (!hasAlias) return false;
  }

  // Work location preference
  if (template.workLocations.length > 0 && project.workLocation) {
    if (!template.workLocations.includes(project.workLocation)) return false;
  }

  // Haul-out filter
  if (!template.acceptsHaulOut && project.haulOutRequired) return false;

  // COI filter
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

      template.bidCount++;
      saveTemplate(template);
    }

    results.push(entry);
    log.push(entry);
  }

  localStorage.setItem(AUTOBID_LOG_KEY, JSON.stringify(log));
  return results;
}

// ── Demo seed data ──────────────────────────────────────────────────────────

const DEMO_TEMPLATES_KEY = "auto_bid_templates_seeded_v2";

export function seedDemoTemplates(): void {
  if (localStorage.getItem(DEMO_TEMPLATES_KEY)) return;

  // Clear old v1 seed
  localStorage.removeItem("auto_bid_templates_seeded");

  const templates: AutoBidTemplate[] = [
    {
      id: "tpl_mm_100hr_verado300",
      vendorId: "MarineMax",
      name: "100-Hour Service — Mercury Verado 300",
      engineType: "Outboard",
      engineMake: "Mercury",
      engineModel: "Verado 300 (2021–present)",
      serviceId: "out-100hr",
      serviceName: "100-Hour Service",
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
      id: "tpl_mm_100hr_yamaha_f300b",
      vendorId: "MarineMax",
      name: "100-Hour Service — Yamaha F300B",
      engineType: "Outboard",
      engineMake: "Yamaha",
      engineModel: "F300B (2021–present)",
      serviceId: "out-100hr",
      serviceName: "100-Hour Service",
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
      id: "tpl_mm_winterize_merc_verado250",
      vendorId: "MarineMax",
      name: "Winterization — Mercury Verado 250",
      engineType: "Outboard",
      engineMake: "Mercury",
      engineModel: "Verado 250 (2021–present)",
      serviceId: "out-winterize",
      serviceName: "Winterization",
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
      id: "tpl_bs_100hr_volvo_d4300",
      vendorId: "Boat Specialists",
      name: "100-Hour Service — Volvo D4-300 IPS",
      engineType: "Inboard",
      engineMake: "Volvo",
      engineModel: "D4-300 IPS (2021–present)",
      serviceId: "in-100hr",
      serviceName: "100-Hour Service",
      message: "Volvo Penta certified dealer with factory-trained technicians. Our 100-hour service includes oil & filter, raw water impeller, belt inspection, coolant check, and full diagnostic scan.",
      lineItems: [
        { description: "100-Hour Service Labor", quantity: 1, unitPrice: 550 },
        { description: "Volvo OEM Oil & Filter Kit", quantity: 1, unitPrice: 120 },
        { description: "Raw Water Impeller", quantity: 1, unitPrice: 85 },
        { description: "Diagnostic Scan & Report", quantity: 1, unitPrice: 0 },
      ],
      mode: "auto",
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
