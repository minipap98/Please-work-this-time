import { useState } from "react";
import { ClipboardCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { useClaimPendingEstimate, useEstimateClaims, useLogBoats, type PendingEstimateClaim } from "@/hooks/use-boat-log";
import { useMyBoats } from "@/hooks/use-my-boat";
import { useDemoMode } from "@/lib/demoMode";
import { cn } from "@/lib/utils";
import { pendingClaimSummary, pickClaimBoat } from "@shared/shop/estimate";

/**
 * Shop estimates the owner approved (or the shop finished) that aren't with one of their boats
 * yet. The database files them by itself when the owner has exactly one boat; this strip is the
 * choice when they have several. Same shape as ReceiptInbox: nothing lands in the Boat Log until
 * the owner picks.
 */
export default function EstimateClaims({ className }: { className?: string }) {
  const { demo } = useDemoMode();
  const claims = useEstimateClaims();
  const { data: boats = [] } = useLogBoats();
  const { primary } = useMyBoats();
  const file = useClaimPendingEstimate();
  const [picks, setPicks] = useState<Record<string, string>>({});

  if (demo) return null;
  const items = claims.data ?? [];
  if (items.length === 0 || boats.length === 0) return null;

  const boatFor = (c: PendingEstimateClaim) => picks[c.token] ?? pickClaimBoat(c, boats, primary?.id)?.id ?? boats[0].id;

  return (
    <section className={cn("min-w-0 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-white border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700"><ClipboardCheck className="w-4 h-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {items.length === 1 ? "1 shop job waiting to be filed" : `${items.length} shop jobs waiting to be filed`}
          </p>
          <p className="text-xs text-muted-foreground">Estimates you approved. Pick the boat each one is for and the shop's record goes into its Boat Log.</p>
          <ul className="mt-3 divide-y divide-emerald-100 rounded-lg border border-emerald-100 bg-white">
            {items.map((c) => (
              <li key={c.token} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <FileText className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                  <p className="text-sm font-medium truncate">{c.title} <span className="text-muted-foreground font-normal">· {c.number}</span></p>
                  <p className="text-xs text-muted-foreground truncate">{pendingClaimSummary(c)}</p>
                </div>
                {boats.length > 1 && (
                  <select
                    aria-label={`Boat for ${c.number}`}
                    className="px-2 py-1.5 text-xs border border-border rounded-lg bg-white max-w-[14rem]"
                    value={boatFor(c)}
                    onChange={(e) => setPicks((p) => ({ ...p, [c.token]: e.target.value }))}
                  >
                    {boats.map((b) => <option key={b.id} value={b.id}>{b.name ? `${b.name} · ${b.label}` : b.label}</option>)}
                  </select>
                )}
                <button
                  onClick={() =>
                    file.mutate(
                      { token: c.token, boatId: boatFor(c) },
                      {
                        onSuccess: (r) => toast.success(r.filed ? "Filed to the Boat Log" : "Kept with your boat. It's filed when the shop marks it complete."),
                        onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
                      },
                    )
                  }
                  disabled={file.isPending}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground whitespace-nowrap disabled:opacity-50"
                >
                  {file.isPending ? "Filing…" : boats.length > 1 ? "File to this boat" : "File it"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
