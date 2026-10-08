// Where a shop stands on price and acceptance versus other shops bidding the same work.
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MIN_SAMPLE, headline, summarizeMarket, type CategoryInsight } from "@bosun/shared/insights";
import { useMarketInsights, useShop } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, Loading, Muted, Screen, Title } from "@/ui";
import { KV, ListHeading } from "@/ui/shop";

const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const money = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }));

function priceLabel(p: number | null): { text: string; color: string } {
  if (p == null) return { text: "Not enough data", color: colors.muted };
  const v = Math.round(p * 100);
  if (Math.abs(v) < 5) return { text: "At market", color: colors.text };
  return v > 0 ? { text: `${v}% above`, color: colors.amber } : { text: `${-v}% below`, color: colors.green };
}

export default function Insights() {
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  const { data, isLoading, isError } = useMarketInsights(vendorId);
  const s = useMemo(() => (data ? summarizeMarket(data) : null), [data]);

  if (shopLoading || isLoading) return <Loading />;
  if (isError) {
    return (
      <Screen><Title>Insights</Title><Muted style={{ color: colors.red }}>Couldn't load market insights. Try again in a minute.</Muted></Screen>
    );
  }
  if (!s || s.bids === 0) {
    return (
      <Screen>
        <Title>Insights</Title>
        <Card style={{ borderStyle: "dashed", alignItems: "center" }}>
          <Text style={{ fontWeight: "600", color: colors.text }}>No bids yet</Text>
          <Muted style={{ textAlign: "center", marginTop: 4 }}>Once you've bid on a few jobs, this shows how your prices and win rate compare with other shops bidding the same work.</Muted>
          <Button title="Browse open jobs" tone="ghost" onPress={() => router.push("/(vendor)/rfps")} />
        </Card>
      </Screen>
    );
  }

  const tip = headline(s);
  const price = priceLabel(s.priceVsMarket);
  return (
    <Screen>
      <Title sub="Your bids next to every other shop bidding the same kind of work.">Your market</Title>
      {tip && (
        <Card style={{ backgroundColor: colors.sky50, borderColor: "#bae6fd" }}>
          <Text style={{ color: "#0c4a6e", fontWeight: "500" }}>{tip}</Text>
        </Card>
      )}
      <Stat
        label="Acceptance rate"
        value={pct(s.winRate)}
        sub={s.winRate == null ? `Needs ${MIN_SAMPLE}+ decided bids (you have ${s.decided})` : `${s.wins} of ${s.decided} decided bids · market ${pct(s.marketWinRate)}`}
        compare={s.winRate != null && s.marketWinRate != null ? { mine: s.winRate, market: s.marketWinRate } : undefined}
      />
      <Stat
        label="Your price on the same jobs"
        value={price.text}
        color={price.color}
        sub={s.priceVsMarket == null ? `Needs ${MIN_SAMPLE}+ jobs where 2+ other shops bid (you have ${s.headToHead})` : `Median vs other shops' bids, across ${s.headToHead} head-to-head jobs`}
      />
      <Stat
        label="Lowest bid"
        value={s.lowestShare == null ? "—" : `${pct(s.lowestShare)} of jobs`}
        sub={s.winRateWhenLowest != null && s.winRateWhenNotLowest != null ? `Win ${pct(s.winRateWhenLowest)} when lowest · ${pct(s.winRateWhenNotLowest)} when not` : "Win rate split appears with more decided head-to-head jobs"}
      />

      <ListHeading>By job type</ListHeading>
      {s.categories.map((c) => <CategoryCard key={c.category} c={c} />)}

      <Muted style={{ marginTop: space.md }}>
        Market numbers combine other shops on Bosun bidding the same job types. A job type only shows market numbers once {MIN_SAMPLE}+ other shops have bid on it, and a job only counts as head-to-head when 2+ other shops bid, so no single shop's price is ever shown. Other shops see your bids the same way.
      </Muted>
    </Screen>
  );
}

function Stat({ label, value, sub, color, compare }: { label: string; value: string; sub: string; color?: string; compare?: { mine: number; market: number } }) {
  return (
    <Card>
      <Muted>{label}</Muted>
      <Text style={{ fontSize: 24, fontWeight: "700", color: color ?? colors.navy, marginTop: 2 }}>{value}</Text>
      {compare && <Bars mine={compare.mine} market={compare.market} />}
      <Muted style={{ marginTop: 6 }}>{sub}</Muted>
    </Card>
  );
}

function Bars({ mine, market }: { mine: number; market: number }) {
  const bar = (label: string, v: number, color: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 4 }}>
      <Text style={{ width: 48, fontSize: 10, color: colors.muted }}>{label}</Text>
      <View style={{ flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
        <View style={{ width: `${Math.min(100, v * 100)}%`, height: "100%", backgroundColor: color }} />
      </View>
      <Text style={{ width: 36, fontSize: 10, color: colors.muted, textAlign: "right" }}>{pct(v)}</Text>
    </View>
  );
  return (
    <View style={{ marginTop: space.sm }}>
      {bar("You", mine, colors.sky)}
      {bar("Market", market, colors.faint)}
    </View>
  );
}

function CategoryCard({ c }: { c: CategoryInsight }) {
  const price = priceLabel(c.priceVsMarket);
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
        <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{c.category}</Text>
        <Text style={{ fontWeight: "600", color: price.color }}>{price.text}</Text>
      </View>
      <KV k="Your bids" v={`${c.bids} · ${c.wins} won of ${c.decided} decided`} />
      <KV k="Acceptance: you vs market" v={`${pct(c.winRate)} · ${c.marketWinRate == null ? "—" : pct(c.marketWinRate)}`} />
      <KV k="Your median" v={money(c.myMedianPrice)} />
      <KV k="Market median" v={c.marketShops == null ? "Needs 3+ shops" : `${money(c.marketMedianPrice)} (${c.marketShops} shops)`} />
    </Card>
  );
}
