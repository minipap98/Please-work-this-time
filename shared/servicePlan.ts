// A boat's maintenance schedule, generated for its engines and confirmed by the owner.
// The server asks Claude for PLAN_SCHEMA; normalizePlan() validates whatever comes back.

import { LOG_CATEGORY_VALUES, type InvoiceCategory } from "./invoice.js";

export interface PlanTask {
  id: string;
  task: string;
  category: InvoiceCategory;
  intervalMonths: number;
  intervalHours: number | null;
  notes: string | null;
}

export interface PlanRecord {
  taskId: string;
  date: string; // YYYY-MM-DD
  engineHours?: number;
}

export interface ServicePlan {
  engineLabel: string;
  tasks: PlanTask[];
  records: PlanRecord[];
  source: "claude" | "manual";
}

export interface EngineRequest {
  engineMake: string;
  engineModel: string;
  engineType: string | null;
  engineCount: number;
  boatYear?: string | null;
  boatMake?: string | null;
  boatModel?: string | null;
}

export const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tasks"],
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "task", "category", "intervalMonths", "intervalHours", "notes"],
        properties: {
          id: { type: "string", description: "snake_case id, e.g. oil_filter, gear_lube, impeller, spark_plugs, fuel_filter, engine_zincs" },
          task: { type: "string", description: "Short name, e.g. 'Engine Oil & Filter'" },
          category: { type: "string", enum: [...LOG_CATEGORY_VALUES] },
          intervalMonths: { type: "integer", description: "Months between services" },
          intervalHours: { type: ["integer", "null"], description: "Engine hours between services, or null if time-based only" },
          notes: { type: ["string", "null"], description: "One line: specs or what to check (oil grade, part, saltwater advice)" },
        },
      },
    },
  },
} as const;

export function engineLabel(e: Pick<EngineRequest, "engineMake" | "engineModel" | "engineCount">): string {
  const count = e.engineCount > 1 ? `${["", "Single", "Twin", "Triple", "Quad", "Quint", "Sextuple"][e.engineCount] ?? `${e.engineCount}×`} ` : "";
  return `${count}${e.engineMake} ${e.engineModel}`.replace(/\s+/g, " ").trim();
}

export function planPrompt(e: EngineRequest): string {
  const boat = [e.boatYear, e.boatMake, e.boatModel].filter(Boolean).join(" ");
  return `List the manufacturer-recommended periodic maintenance schedule for this marine engine, as an owner would find it in the owner's manual.

Engine: ${engineLabel(e)}${e.engineType ? ` (${e.engineType})` : ""}${boat ? `\nBoat: ${boat}` : ""}

- Engine and drive items only (oil, filters, gear lube, impeller, plugs, anodes, belts, thermostats, fuel system, etc.). Skip boat-wide items like bilge pumps and safety gear.
- Use the manufacturer's intervals for this engine family and generation. Where the manual gives "hours or months, whichever comes first", give both.
- Assume saltwater use; mention in notes where saltwater shortens an interval.
- Keep notes to one short line with specs (e.g. oil grade) when the manual gives them.
- 6 to 16 items. Don't invent model-specific claims you aren't sure of; prefer the general schedule for the engine family.`;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

export function normalizePlan(raw: unknown): PlanTask[] {
  const list = (raw as { tasks?: unknown })?.tasks;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: PlanTask[] = [];
  for (const t of list) {
    if (!t || typeof t !== "object") continue;
    const r = t as Record<string, unknown>;
    const task = typeof r.task === "string" ? r.task.trim().slice(0, 80) : "";
    if (!task) continue;
    let id = slug(typeof r.id === "string" && r.id ? r.id : task) || "task";
    while (seen.has(id)) id = `${id}_2`;
    seen.add(id);
    const months = Math.round(Number(r.intervalMonths));
    const hours = r.intervalHours == null ? null : Math.round(Number(r.intervalHours));
    out.push({
      id,
      task,
      category: (LOG_CATEGORY_VALUES as readonly string[]).includes(r.category as string)
        ? (r.category as InvoiceCategory)
        : "Engine Oil & Fuel",
      intervalMonths: Number.isFinite(months) ? Math.min(120, Math.max(1, months)) : 12,
      intervalHours: hours != null && Number.isFinite(hours) && hours >= 10 && hours <= 10000 ? hours : null,
      notes: typeof r.notes === "string" && r.notes.trim() ? r.notes.trim().slice(0, 200) : null,
    });
  }
  return out.slice(0, 24);
}
