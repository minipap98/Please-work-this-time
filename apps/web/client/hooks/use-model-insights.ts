import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { useDemoMode } from "@/lib/demoMode";
import { canLookUpInsights, modelInsights, type FailurePattern, type InsightBoat, type ModelInsights } from "@shared/boats/insights";

export type { FailurePattern, InsightBoat, KnownIssue, ModelInsights } from "@shared/boats/insights";

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
      return modelInsights(supabase, boat!);
    },
    enabled: canLookUpInsights(boat),
    staleTime: 10 * 60 * 1000,
  });
}
