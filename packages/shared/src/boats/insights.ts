// What Bosun knows about boats like yours: admin-curated weak spots plus parts replaced on
// several boats of the same model or engine (counts only, never other owners' records).

import type { Db } from "../db/client";

export interface KnownIssue {
  component: string;
  summary: string;
  advice: string | null;
  source: string;
}

export interface FailurePattern {
  component: string;
  scope: "model" | "engine";
  boats: number;
  of_boats: number;
}

export interface ModelInsights {
  known: KnownIssue[];
  patterns: FailurePattern[];
}

export interface InsightBoat {
  make: string;
  model: string;
  engineMake?: string | null;
  engineModel?: string | null;
}

/** True when there's enough to look up (a real make and model). */
export function canLookUpInsights(b: InsightBoat | null | undefined): b is InsightBoat {
  return !!b && !!b.make && !!b.model && b.make !== "Unknown" && b.model !== "Unknown";
}

export async function modelInsights(client: Db, boat: InsightBoat): Promise<ModelInsights> {
  const { data, error } = await client.rpc("model_insights", {
    p_make: boat.make,
    p_model: boat.model,
    p_engine_make: boat.engineMake || null,
    p_engine_model: boat.engineModel || null,
  });
  if (error) throw error;
  const d = (data ?? {}) as Partial<ModelInsights>;
  return { known: d.known ?? [], patterns: d.patterns ?? [] };
}

/** "Sea Ray SDX 250 OBs" / "boats with a Mercury Verado 250" */
export function patternScopeLabel(p: Pick<FailurePattern, "scope">, boat: InsightBoat): string {
  if (p.scope === "model") return `${boat.make} ${boat.model}s`;
  const engine = [boat.engineMake, (boat.engineModel ?? "").replace(/\s*\(.*\)\s*$/, "")].filter(Boolean).join(" ");
  return `boats with a ${engine}`;
}
