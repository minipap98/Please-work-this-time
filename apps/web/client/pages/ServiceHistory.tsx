import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Printer, UserRound } from "lucide-react";
import { BosunLogo } from "@/components/marketing/BosunLogo";
import { usePublicHistory } from "@/hooks/use-boat-log";
import { historyHighlights, type HistoryEntry } from "@shared/boatLog";

function longDate(ymd: string) {
  return new Date(`${ymd.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Public service history for a boat listing. No login; read by share link only. */
export default function ServiceHistory() {
  const { token } = useParams();
  const { data, isLoading, isError } = usePublicHistory(token);
  const highlights = useMemo(() => (data ? historyHighlights(data) : null), [data]);

  const byYear = useMemo(() => {
    const m = new Map<string, HistoryEntry[]>();
    for (const e of data?.entries ?? []) m.set(e.date.slice(0, 4), [...(m.get(e.date.slice(0, 4)) ?? []), e]);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#052443]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <BosunLogo className="h-6" />
        <p className="mt-8 text-lg font-semibold text-[#052443]">This service history isn't shared anymore</p>
        <p className="mt-2 text-sm text-slate-600 max-w-sm">
          The owner may have turned off the link. Ask the seller for a new one.
        </p>
        <Link to="/boaters" className="mt-6 text-sm font-semibold text-sky-700 hover:underline">What is Bosun?</Link>
      </div>
    );
  }

  const boatTitle = [data.boat.year, data.boat.make, data.boat.model].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <header className="bg-white border-b border-border print:border-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/boaters" aria-label="Bosun"><BosunLogo className="h-5" /></Link>
          <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#052443]"
          >
            <Printer className="w-4 h-4" /> Print or save PDF
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Service history</p>
        <h1 className="mt-1 text-3xl font-bold text-[#052443]">{boatTitle}</h1>
        <p className="mt-1 text-slate-600">
          {data.boat.name && <>"{data.boat.name}"</>}
          {data.boat.name && data.boat.engine && " · "}
          {data.boat.engine}
        </p>

        {highlights && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Services on record" value={String(highlights.jobs)} sub={highlights.firstYear ? `since ${highlights.firstYear}` : undefined} />
            <Stat label="Done by a shop" value={String(highlights.verified)} sub="recorded by the shop" />
            <Stat label="Last service" value={highlights.lastService ? longDate(highlights.lastService) : "—"} />
            <Stat
              label={highlights.totalSpent != null ? "Spent on service" : "Engine hours"}
              value={highlights.totalSpent != null ? money(highlights.totalSpent) : highlights.latestEngineHours != null ? String(highlights.latestEngineHours) : "—"}
              sub={highlights.totalSpent != null ? undefined : "last recorded"}
            />
          </div>
        )}

        {data.entries.length === 0 ? (
          <p className="mt-10 text-sm text-slate-600 bg-white border border-dashed border-border rounded-xl p-6 text-center">
            No services have been logged for this boat yet.
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            {byYear.map(([year, list]) => (
              <section key={year}>
                <h2 className="text-xs font-bold tracking-wider text-slate-500 mb-2">{year}</h2>
                <ul className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  {list.map((e, i) => (
                    <li key={i} className="px-4 py-3 flex items-start gap-3 break-inside-avoid">
                      <span className="w-20 shrink-0 text-xs text-slate-500 pt-0.5">{longDate(e.date)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#052443]">{e.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {e.verified ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <BadgeCheck className="w-3.5 h-3.5" /> {e.shop ?? "Shop"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="w-3.5 h-3.5" /> {e.shop ? `${e.shop} (logged by owner)` : "Owner (DIY)"}
                            </span>
                          )}
                          {e.category && <span>· {e.category}</span>}
                          {e.engineHours != null && <span>· {e.engineHours} engine hrs</span>}
                        </p>
                      </div>
                      {data.showCosts && e.cost != null && (
                        <span className="text-sm font-semibold tabular-nums text-[#052443]">{money(Number(e.cost))}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="mt-8 text-xs text-slate-500 leading-relaxed space-y-1">
          <p>
            <BadgeCheck className="inline w-3.5 h-3.5 text-emerald-600 -mt-0.5" /> <b>Shop-recorded</b> entries were written
            by the shop when it completed the job on Bosun. <UserRound className="inline w-3.5 h-3.5 -mt-0.5" /> <b>Owner-logged</b>{" "}
            entries were added by the owner.
          </p>
          <p>
            Shared by the owner through Bosun. This history covers work recorded on Bosun and isn't a survey or inspection.
          </p>
        </div>

        <div className="print:hidden mt-10 rounded-2xl bg-[#052443] text-white p-6 text-center">
          <p className="font-semibold">Keep your own boat's history like this</p>
          <p className="mt-1 text-sm text-slate-300">Free on Bosun. Shops record their work; you share it when it's time to sell.</p>
          <Link to="/boaters" className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold">
            Learn more
          </Link>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-lg font-bold text-[#052443] tabular-nums truncate">{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}
