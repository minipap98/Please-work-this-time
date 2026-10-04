// Vendor Insights: where a shop stands on price and acceptance versus its market.
// The database only ever hands a vendor its own bids plus anonymized market
// aggregates (see vendor_market_insights()); this file turns those into the page.

/** One of the vendor's own bids, with the competition on that same job summarized. */
export interface MyBidStat {
  category: string;
  price: number;
  /** Median of the other shops' bids on the same job. Null unless 2+ other shops bid. */
  peerMedian: number | null;
  /** Whether this was the lowest bid on the job. Null unless 2+ other shops bid. */
  lowest: boolean | null;
  /** The owner picked a bid (anyone's). */
  decided: boolean;
  won: boolean;
}

/** Other shops' bids in a category, aggregated. Only sent when 3+ other shops bid there. */
export interface CategoryMarket {
  category: string;
  vendors: number;
  bids: number;
  decided: number;
  wins: number;
  medianPrice: number | null;
}

export interface MarketInput {
  mine: MyBidStat[];
  market: CategoryMarket[];
}

export interface CategoryInsight {
  category: string;
  bids: number;
  decided: number;
  wins: number;
  winRate: number | null;
  marketWinRate: number | null;
  marketShops: number | null;
  myMedianPrice: number | null;
  marketMedianPrice: number | null;
  /** My median price vs the market median in this category, e.g. 0.12 = 12% higher. */
  priceVsMarket: number | null;
}

export interface MarketInsights {
  bids: number;
  decided: number;
  wins: number;
  winRate: number | null;
  marketWinRate: number | null;
  /** Jobs where 2+ other shops also bid. */
  headToHead: number;
  /** Median of (my price / others' median on the same job) - 1, across head-to-head jobs. */
  priceVsMarket: number | null;
  /** Share of head-to-head jobs where I was the lowest bid. */
  lowestShare: number | null;
  winRateWhenLowest: number | null;
  winRateWhenNotLowest: number | null;
  categories: CategoryInsight[];
}

/** Below this many data points a rate or comparison is noise, so we show nothing. */
export const MIN_SAMPLE = 3;

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function rate(wins: number, decided: number): number | null {
  return decided >= MIN_SAMPLE ? wins / decided : null;
}

export function summarizeMarket({ mine, market }: MarketInput): MarketInsights {
  const decided = mine.filter((b) => b.decided);
  const wins = decided.filter((b) => b.won).length;

  const h2h = mine.filter((b) => b.peerMedian != null && b.peerMedian > 0);
  const h2hDecided = h2h.filter((b) => b.decided);
  const lowest = h2hDecided.filter((b) => b.lowest);
  const notLowest = h2hDecided.filter((b) => b.lowest === false);

  const marketDecided = market.reduce((s, m) => s + m.decided, 0);
  const marketWins = market.reduce((s, m) => s + m.wins, 0);

  const byCat = new Map<string, MyBidStat[]>();
  for (const b of mine) byCat.set(b.category, [...(byCat.get(b.category) ?? []), b]);

  const categories: CategoryInsight[] = [...byCat.entries()]
    .map(([category, list]) => {
      const m = market.find((x) => x.category === category);
      const d = list.filter((b) => b.decided);
      const w = d.filter((b) => b.won).length;
      const myMedianPrice = list.length >= MIN_SAMPLE ? median(list.map((b) => b.price)) : null;
      const marketMedianPrice = m?.medianPrice ?? null;
      return {
        category,
        bids: list.length,
        decided: d.length,
        wins: w,
        winRate: rate(w, d.length),
        marketWinRate: m ? rate(m.wins, m.decided) : null,
        marketShops: m?.vendors ?? null,
        myMedianPrice,
        marketMedianPrice,
        priceVsMarket:
          myMedianPrice != null && marketMedianPrice ? myMedianPrice / marketMedianPrice - 1 : null,
      };
    })
    .sort((a, b) => b.bids - a.bids || a.category.localeCompare(b.category));

  return {
    bids: mine.length,
    decided: decided.length,
    wins,
    winRate: rate(wins, decided.length),
    marketWinRate: rate(marketWins, marketDecided),
    headToHead: h2h.length,
    priceVsMarket:
      h2h.length >= MIN_SAMPLE ? median(h2h.map((b) => b.price / b.peerMedian! - 1)) : null,
    lowestShare: h2h.length >= MIN_SAMPLE ? h2h.filter((b) => b.lowest).length / h2h.length : null,
    winRateWhenLowest: rate(lowest.filter((b) => b.won).length, lowest.length),
    winRateWhenNotLowest: rate(notLowest.filter((b) => b.won).length, notLowest.length),
    categories,
  };
}

/** One plain-language takeaway for the top of the page, or null when there's not enough data. */
export function headline(s: MarketInsights): string | null {
  if (s.winRateWhenLowest != null && s.winRateWhenNotLowest != null) {
    const a = Math.round(s.winRateWhenLowest * 100);
    const b = Math.round(s.winRateWhenNotLowest * 100);
    if (a - b >= 15) return `Price decides your jobs: you win ${a}% when you're the lowest bid and ${b}% when you're not.`;
    if (b >= a) return `Owners pick you even when you're not cheapest (${b}% win rate). You may have room to raise prices.`;
  }
  if (s.priceVsMarket != null) {
    const p = Math.round(Math.abs(s.priceVsMarket) * 100);
    if (p < 5) return "Your prices sit right at the market median.";
    return `Your bids run ${p}% ${s.priceVsMarket > 0 ? "above" : "below"} other shops on the same jobs.`;
  }
  return null;
}
