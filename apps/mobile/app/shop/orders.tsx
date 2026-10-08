// Work orders: the board as a list, filtered by status or billing step, plus won Bosun jobs waiting to go on it.
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { billingStep, partsProgress, workOrderTotals, type WorkOrder } from "@bosun/shared/shop";
import { wonJobsNotOnBoard } from "@bosun/shared/shop/today";
import { useVendorBidProjects } from "@/lib/queries";
import { useShipments, useShop, useShopRealtime, useWorkOrders } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, Chip, Empty, Loading, Muted, Row, Screen } from "@/ui";
import { WorkOrderBadge, money, timeRange } from "@/ui/shop";

type Filter = "all" | "scheduled" | "in-progress" | "waiting-parts" | "completed" | "invoiced" | "to-invoice" | "owed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in-progress", label: "In progress" },
  { key: "waiting-parts", label: "Waiting on parts" },
  { key: "completed", label: "Completed" },
  { key: "invoiced", label: "Invoiced" },
  { key: "to-invoice", label: "To invoice" },
  { key: "owed", label: "Owed" },
];

function matches(o: WorkOrder, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "to-invoice") return billingStep(o) === "invoice";
  if (f === "owed") return billingStep(o) === "collect";
  return o.status === f;
}

export default function WorkOrders() {
  const router = useRouter();
  const { q: initialQ } = useLocalSearchParams<{ q?: string }>();
  const { vendorId, isLoading: shopLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: orders = [], isLoading, refetch, isRefetching } = useWorkOrders(vendorId);
  const { data: shipments = [] } = useShipments(vendorId);
  const { data: bidJobs = [] } = useVendorBidProjects(vendorId);
  const [q, setQ] = useState(initialQ ?? "");
  const [filter, setFilter] = useState<Filter>("all");

  const won = useMemo(() => (vendorId ? wonJobsNotOnBoard(bidJobs, orders, vendorId) : []), [bidJobs, orders, vendorId]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (!matches(o, filter)) return false;
      if (!needle) return true;
      return [o.title, o.number, o.customerName, o.boatLabel].some((f) => f.toLowerCase().includes(needle));
    });
  }, [orders, q, filter]);

  if (shopLoading || isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Empty title="No shop yet" body="Finish setting up your shop on getbosun.app to open the board." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Row style={{ marginBottom: space.sm }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Find a boat, customer or WO number"
          placeholderTextColor={colors.faint}
          autoCorrect={false}
          style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text }}
        />
        <Button title="New" onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: "new" } })} />
      </Row>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          won.length > 0 && filter === "all" && !q.trim() ? (
            <View style={{ marginBottom: space.sm }}>
              {won.map((p) => (
                <Card key={p.id} style={{ borderColor: colors.sky, backgroundColor: colors.sky50 }}>
                  <Text style={{ fontWeight: "600", color: colors.text }} numberOfLines={1}>{p.title}</Text>
                  <Muted style={{ marginTop: 2 }}>Won on Bosun · {p.ownerContact?.name ?? p.owner ?? "Boat owner"}{p.boat ? ` · ${[p.boat.year, p.boat.make, p.boat.model].filter(Boolean).join(" ")}` : ""}</Muted>
                  <Button title="Put on the board" tone="secondary" style={{ marginTop: space.sm }} onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: "new", project: p.id } })} />
                </Card>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={<Empty title={orders.length ? "Nothing matches" : "No work orders yet"} body={orders.length ? "Try another filter." : "Tap New to open the first one."} />}
        renderItem={({ item: o }) => {
          const parts = partsProgress(o.id, shipments);
          const partsNote = parts.total === 0 ? null : parts.problems ? "Delivery problem" : parts.open ? `Parts ${parts.received}/${parts.total} in` : "Parts in";
          return (
            <Card onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: o.id } })}>
              <Row style={{ justifyContent: "space-between" }}>
                <Muted>{o.number}</Muted>
                <WorkOrderBadge status={o.status} />
              </Row>
              <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, marginTop: 4 }} numberOfLines={1}>{o.title || "Untitled"}</Text>
              <Muted style={{ marginTop: 2 }} numberOfLines={1}>{[o.boatLabel || o.customerName, o.bay, o.assignedTo].filter(Boolean).join(" · ")}</Muted>
              <Row style={{ justifyContent: "space-between", marginTop: space.sm }}>
                <Muted>{timeRange(o.scheduledStart, o.scheduledEnd)}</Muted>
                <Text style={{ fontWeight: "700", color: colors.navy }}>{money(workOrderTotals(o.lines, o.taxRate).total)}</Text>
              </Row>
              {partsNote && <Text style={{ fontSize: 12, fontWeight: "600", marginTop: 4, color: parts.problems ? colors.red : parts.open ? colors.amber : colors.green }}>{partsNote}</Text>}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
