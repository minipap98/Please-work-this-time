import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, Lock } from "lucide-react";
import { useMarketInsights } from "@/hooks/use-insights";
import { MIN_SAMPLE, headline, summarizeMarket, type CategoryInsight } from "@shared/insights";
import { cn } from "@/lib/utils";

const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const money = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function priceLabel(p: number | null) {
  if (p == null) return { text: "Not enough data", cls: "text-muted-foreground" };
  const v = Math.round(p * 100);
  if (Math.abs(v) < 5) return { text: "At market", cls: "text-slate-700" };
  return v > 0
    ? { text: `${v}% above`, cls: "text-amber-700" }
    : { text: `${-v}% below`, cls: "text-emerald-700" };
}

/** Where a shop stands on price and acceptance versus other shops bidding the same work. */
export default function MarketTab({ vendorId }: { vendorId: string | null }) {
  const { data, isLoading, isError } = useMarketInsights(vendorId);
  const s = useMemo(() => (data ? summarizeMarket(data) : null), [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Loading your market…</p>;
  if (isError)
    return <p className="text-sm text-red-600 py-10 text-center">Couldn't load market insights. Try again in a minute.</p>;

  if (!s || s.bids === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center">
        <p className="font-semibold text-foreground">No bids yet</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Once you've bid on a few jobs, this shows how your prices and win rate compare with other shops bidding the same work.
        </p>
        <Link to="/vendor-rfps" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
          Browse open jobs →
        </Link>
      </div>
    );
  }

  const tip = headline(s);
  const price = priceLabel(s.priceVsMarket);

  return (
    <div className="space-y-5">
      {tip && (
        <div className="flex items-start gap-3 rounded-xl bg-sky-50 border border-sky-200 p-4">
          <Lightbulb className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-sm text-sky-900 font-medium">{tip}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          label="Acceptance rate"
          value={pct(s.winRate)}
          sub={
            s.winRate == null
              ? `Needs ${MIN_SAMPLE}+ decided bids (you have ${s.decided})`
              : `${s.wins} of ${s.decided} decided bids · market ${pct(s.marketWinRate)}`
          }
          compare={s.winRate != null && s.marketWinRate != null ? { mine: s.winRate, market: s.marketWinRate } : undefined}
        />
        <Card
          label="Your price on the same jobs"
          value={price.text}
          valueCls={price.cls}
          sub={
            s.priceVsMarket == null
              ? `Needs ${MIN_SAMPLE}+ jobs where 2+ other shops bid (you have ${s.headToHead})`
              : `Median vs other shops' bids, across ${s.headToHead} head-to-head jobs`
          }
        />
        <Card
          label="Lowest bid"
          value={s.lowestShare == null ? "—" : `${pct(s.lowestShare)} of jobs`}
          sub={
            s.winRateWhenLowest != null && s.winRateWhenNotLowest != null
              ? `Win ${pct(s.winRateWhenLowest)} when lowest · ${pct(s.winRateWhenNotLowest)} when not`
              : "Win rate split appears with more decided head-to-head jobs"
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">By job type</p>
          <p className="text-xs text-muted-foreground">Your bids next to every other shop bidding the same kind of work</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/30 whitespace-nowrap">
              <tr>
                <th className="text-left font-medium px-4 py-2">Job type</th>
                <th className="text-right font-medium px-3 py-2">Your bids</th>
                <th className="text-left font-medium px-3 py-2 min-w-[180px]">Acceptance: you vs market</th>
                <th className="text-right font-medium px-3 py-2">Your median</th>
                <th className="text-right font-medium px-3 py-2">Market median</th>
                <th className="text-right font-medium px-4 py-2">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.categories.map((c) => (
                <CategoryRow key={c.category} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Market numbers combine other shops on Bosun bidding the same job types. A job type only shows market numbers once{" "}
        {MIN_SAMPLE}+ other shops have bid on it, and a job only counts as head-to-head when 2+ other shops bid, so no single
        shop's price is ever shown. Other shops see your bids the same way.
      </p>
    </div>
  );
}

function Card({
  label, value, sub, valueCls, compare,
}: {
  label: string;
  value: string;
  sub: string;
  valueCls?: string;
  compare?: { mine: number; market: number };
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold text-foreground tabular-nums", valueCls)}>{value}</p>
      {compare && <Bars mine={compare.mine} market={compare.market} />}
      <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Bars({ mine, market }: { mine: number; market: number }) {
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-12 text-[10px] text-muted-foreground">You</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, mine * 100)}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 text-[10px] text-muted-foreground">Market</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${Math.min(100, market * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ c }: { c: CategoryInsight }) {
  const price = priceLabel(c.priceVsMarket);
  return (
    <tr>
      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
        {c.category}
        {c.marketShops != null && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{c.marketShops} shops</span>}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{c.bids}</td>
      <td className="px-3 py-2.5">
        {c.winRate != null && c.marketWinRate != null ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Bars mine={c.winRate} market={c.marketWinRate} />
            </div>
            <span className="text-xs tabular-nums whitespace-nowrap">
              {pct(c.winRate)} <span className="text-muted-foreground">vs {pct(c.marketWinRate)}</span>
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {c.winRate != null ? `${pct(c.winRate)} · market not enough data` : "Not enough decided bids"}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{money(c.myMedianPrice)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{money(c.marketMedianPrice)}</td>
      <td className={cn("px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap", price.cls)}>{price.text}</td>
    </tr>
  );
}
