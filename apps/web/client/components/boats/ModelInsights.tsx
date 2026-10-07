import { AlertTriangle, LineChart } from "lucide-react";
import { useModelInsights, type InsightBoat } from "@/hooks/use-model-insights";

/** Known weak spots for this make/model/engine, plus patterns seen across boats like it on Bosun. */
export default function ModelInsights({ boat }: { boat: InsightBoat }) {
  const { data, isLoading, isError } = useModelInsights(boat);
  const modelName = `${boat.make} ${boat.model}`;
  const engineName = [boat.engineMake, boat.engineModel?.replace(/\s*\(.*\)$/, "")].filter(Boolean).join(" ");

  const known = data?.known ?? [];
  const patterns = data?.patterns ?? [];
  const extra = patterns.filter((p) => !known.some((k) => k.component === p.component));
  const seen = (component: string) => patterns.find((p) => p.component === component);
  const scopeLabel = (scope: "model" | "engine") => (scope === "model" ? `${modelName}s` : `boats with a ${engineName || "this engine"}`);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <LineChart className="w-3.5 h-3.5" /> Model insights
      </p>
      {isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Checking boats like yours…</p>
      ) : isError ? (
        <p className="mt-2 text-xs text-muted-foreground">Model insights aren't available right now.</p>
      ) : known.length === 0 && extra.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No known weak spots for the {modelName} yet. As more boats like yours log work on Bosun, patterns show up here.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {known.map((k) => {
            const p = seen(k.component);
            return (
              <div key={k.component} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Common failure point: {k.component.toLowerCase()}</p>
                    <p className="mt-0.5 text-xs text-slate-700">{k.summary}{k.advice ? ` ${k.advice}` : ""}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {k.source}
                      {p ? ` · replaced on ${p.boats} of ${p.of_boats} ${scopeLabel(p.scope)} on Bosun` : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {extra.map((p) => (
            <div key={p.component} className="rounded-lg border border-border bg-white p-3">
              <p className="text-sm font-semibold text-foreground">{p.component}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Replaced on {p.boats} of {p.of_boats} {scopeLabel(p.scope)} on Bosun. Worth having your shop look at it.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
