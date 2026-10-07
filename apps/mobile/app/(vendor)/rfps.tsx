import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatMiles } from "@bosun/shared/geo";
import { DEFAULT_SERVICE_RADIUS_MILES, rankOpenJobs } from "@bosun/shared/marketplace/rfpFeed";
import { useMyVendorProfile, useOpenRfps, useVendorBidProjects } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Badge, Card, Chip, Empty, Loading, Muted, Row, Screen, Title } from "@/ui";

const RADII = [10, 25, 50, 100, 200] as const;

export default function JobsNearYou() {
  const router = useRouter();
  const { data: shop } = useMyVendorProfile();
  const { data: open = [], isLoading, refetch, isRefetching } = useOpenRfps();
  const { data: mine = [] } = useVendorBidProjects(shop?.id);
  const myBidIds = useMemo(() => new Set(mine.map((p) => p.id)), [mine]);
  const here = shop && shop.lat != null && shop.lng != null ? { lat: shop.lat, lng: shop.lng } : null;
  const [limit, setLimit] = useState<number | null | undefined>(undefined);
  const miles = limit === undefined ? (here ? shop?.service_radius_miles ?? DEFAULT_SERVICE_RADIUS_MILES : null) : limit;
  const ranked = useMemo(() => rankOpenJobs(open, { shop: here, limitMiles: miles }), [open, here?.lat, here?.lng, miles]);

  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <Title sub={`${ranked.length} job${ranked.length === 1 ? "" : "s"} accepting bids${miles != null ? ` within ${miles} miles` : ""}`}>Jobs near you</Title>
      {here ? (
        <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
          {RADII.map((r) => (
            <Chip key={r} label={`${r} mi`} selected={miles === r} onPress={() => setLimit(r)} />
          ))}
          <Chip label="Any" selected={miles === null} onPress={() => setLimit(null)} />
        </Row>
      ) : (
        <Muted style={{ marginBottom: space.md }}>Add your shop's location on getbosun.app (Shop → Settings) to filter by distance.</Muted>
      )}
      <FlatList
        data={ranked}
        keyExtractor={(r) => r.p.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Empty title="No open jobs right now" body="Check back soon." />}
        renderItem={({ item: { p, miles: away } }) => (
          <Card onPress={() => router.push({ pathname: "/project/[id]", params: { id: p.id } })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
              <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{p.title}</Text>
              {myBidIds.has(p.id) ? <Badge tone="green">Bid sent</Badge> : <Badge tone="sky">{p.status === "gathering" ? "Gathering" : "Accepting bids"}</Badge>}
            </View>
            <Muted style={{ marginTop: 2 }}>
              {p.date}
              {away != null ? ` · ${formatMiles(away)} away` : p.location ? ` · ${p.location}` : ""}
              {p.category ? ` · ${p.category}` : ""}
            </Muted>
            <Text style={{ color: colors.text, marginTop: space.sm }} numberOfLines={3}>{p.description}</Text>
            {p.boat && <Muted style={{ marginTop: space.sm }}>{[p.boat.year, p.boat.make, p.boat.model, p.boat.propulsion].filter(Boolean).join(" · ")}</Muted>}
            <Muted style={{ marginTop: 4 }}>{p.bids.length} bid{p.bids.length === 1 ? "" : "s"} so far</Muted>
          </Card>
        )}
      />
    </Screen>
  );
}
