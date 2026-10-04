import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { useDemoMode } from "@/lib/demoMode";

export interface KnownIssue {
  component: string;
  summary: string;
  advice: string | null;
  source: string;
}

/** Same part replaced on several boats of the same model (or engine) on Bosun. Counts only. */
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

function demoInsights(b: InsightBoat): ModelInsights {
  const sdx = b.make === "Sea Ray" && b.model.startsWith("SDX 250");
  return {
    known: sdx
      ? [{
          component: "Power steering pump",
          summary: "A known weak spot on this model. Pumps get replaced often.",
          advice: "Ask your shop to check the pump and fluid at your next service.",
          source: "Reported by marine technicians",
        }]
      : [],
    patterns: [
      { component: "Power steering pump", scope: "model", boats: 7, of_boats: 41 },
      { component: "Water pump / impeller", scope: "engine", boats: 12, of_boats: 96 },
    ].filter((p) => sdx || p.scope === "engine") as FailurePattern[],
  };
}

export function useModelInsights(boat: InsightBoat | null) {
  const { demo } = useDemoMode();
  return useQuery({
    queryKey: ["model-insights", demo, boat?.make, boat?.model, boat?.engineMake, boat?.engineModel],
    queryFn: async (): Promise<ModelInsights> => {
      if (demo) return demoInsights(boat!);
      if (supabaseMissing) return { known: [], patterns: [] };
      const { data, error } = await supabase.rpc("model_insights", {
        p_make: boat!.make,
        p_model: boat!.model,
        p_engine_make: boat!.engineMake || null,
        p_engine_model: boat!.engineModel || null,
      });
      if (error) throw error;
      const d = (data ?? {}) as Partial<ModelInsights>;
      return { known: d.known ?? [], patterns: d.patterns ?? [] };
    },
    enabled: !!boat?.make && !!boat?.model && boat.make !== "Unknown",
    staleTime: 10 * 60 * 1000,
  });
}
