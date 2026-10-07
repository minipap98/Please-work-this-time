// A shared service history, opened from a getbosun.app/history link. Public: no login.
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { historyHighlights, type HistoryEntry } from "@bosun/shared/boatLog";
import { usePublicHistory } from "@/lib/boatLog";
import { colors, space } from "@/lib/theme";
import { Badge, Card, Empty, Loading, Muted, Row, Screen, Title } from "@/ui";
import { SectionTitle, StatTile, formatDate, money } from "@/ui/pickers";

export default function SharedHistoryScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, isLoading, isError } = usePublicHistory(token);
  if (isLoading) return <Loading />;
  if (isError || !data) return <Screen><Empty title="This history isn't shared anymore" body="The owner turned the link off, or it never existed." /></Screen>;
  const h = historyHighlights(data);
  const byYear = new Map<string, HistoryEntry[]>();
  for (const e of data.entries) byYear.set(e.date.slice(0, 4), [...(byYear.get(e.date.slice(0, 4)) ?? []), e]);
  const boat = [data.boat.year, data.boat.make, data.boat.model].filter(Boolean).join(" ");
  return (
    <Screen>
      <Title sub={[boat, data.boat.engine].filter(Boolean).join(" · ")}>{data.boat.name || boat}</Title>
      <Row style={{ marginBottom: space.md }}>
        <StatTile label="Jobs" value={h.jobs} />
        <StatTile label="Shop-verified" value={h.verified} tone="green" />
        <StatTile label={h.totalSpent != null ? "Spent" : "Shops"} value={h.totalSpent != null ? money(h.totalSpent).replace(/\.00$/, "") : h.shops} />
      </Row>
      <Muted style={{ marginBottom: space.md }}>Shared by the owner through Bosun{h.firstYear ? ` · records since ${h.firstYear}` : ""}{h.latestEngineHours != null ? ` · ${h.latestEngineHours} engine hours` : ""}</Muted>
      {[...byYear.entries()].map(([year, list]) => (
        <View key={year}>
          <SectionTitle>{year}</SectionTitle>
          {list.map((e, i) => (
            <Card key={`${year}-${i}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{e.title}</Text>
                {e.cost != null && <Text style={{ fontWeight: "700", color: colors.navy }}>{money(e.cost)}</Text>}
              </View>
              <Muted>{formatDate(e.date)}{e.shop ? ` · ${e.shop}` : ""}{e.engineHours != null ? ` · ${e.engineHours} hrs` : ""}</Muted>
              <Row style={{ marginTop: space.sm }}>
                {e.verified ? <Badge tone="green">Verified by the shop</Badge> : <Badge tone="muted">Owner logged</Badge>}
                {!!e.category && <Badge tone="sky">{e.category}</Badge>}
              </Row>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}
