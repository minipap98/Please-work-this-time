// Vendor home: what needs the shop now, today's board, parts arriving, and the money picture.
import { useMemo } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { partsProgress, shopAlerts, type AlertTone, type ShopAlert, type ShopTab } from "@bosun/shared/shop";
import { arrivingToday, shopMoney, todayBoard, wonJobsNotOnBoard } from "@bosun/shared/shop/today";
import { useMyVendorProfile, useVendorBidProjects } from "@/lib/queries";
import { useInventory, useReceiveShipment, useSetWorkOrderStatus, useShipments, useShop, useShopRealtime, useWorkOrders } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Loading, Muted, Row, Screen, Title } from "@/ui";
import { LinkRow, SectionTitle, StatTile } from "@/ui/pickers";
import { ShipmentBadge, WorkOrderBadge, hhmm, money } from "@/ui/shop";

const TONE: Record<AlertTone, string> = { urgent: colors.red, warn: colors.amber, good: colors.green, info: colors.sky600 };

/** Where each alert's web tab lives in the app. */
const TAB_ROUTE: Record<ShopTab, "/shop/orders" | "/shop/schedule" | "/shop/inventory" | "/shop/parts" | "/shop/settings" | "/(vendor)/shop"> = {
  orders: "/shop/orders",
  schedule: "/shop/schedule",
  inventory: "/shop/inventory",
  parts: "/shop/parts",
  settings: "/shop/settings",
  quickbooks: "/(vendor)/shop",
};

export default function Today() {
  const router = useRouter();
  const { vendorId, shopName, isLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: vendor } = useMyVendorProfile();
  const orders = useWorkOrders(vendorId);
  const shipments = useShipments(vendorId);
  const inventory = useInventory(vendorId);
  const bidJobs = useVendorBidProjects(vendorId);
  const receive = useReceiveShipment(vendorId);
  const setStatus = useSetWorkOrderStatus(vendorId);

  const o = orders.data ?? [];
  const s = shipments.data ?? [];
  const inv = inventory.data ?? [];
  const jobs = bidJobs.data ?? [];
  const coiExpiry = (vendor as { insurance_expiry?: string | null } | null | undefined)?.insurance_expiry ?? null;

  const won = useMemo(() => (vendorId ? wonJobsNotOnBoard(jobs, o, vendorId) : []), [jobs, o, vendorId]);
  const alerts = useMemo(() => shopAlerts({ orders: o, shipments: s, inventory: inv, wonJobsNotOnBoard: won.length, coiExpiry }), [o, s, inv, won.length, coiExpiry]);
  const board = useMemo(() => todayBoard(o), [o]);
  const arriving = useMemo(() => arrivingToday(s), [s]);
  const cash = useMemo(() => shopMoney(o), [o]);

  if (isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Title>No shop profile yet</Title>
        <Muted>Finish onboarding to create one.</Muted>
        <Button title="Set up my shop" onPress={() => router.push("/onboarding")} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  const refreshing = orders.isRefetching || shipments.isRefetching;
  const refresh = () => {
    orders.refetch();
    shipments.refetch();
    inventory.refetch();
    bidJobs.refetch();
  };
  const fail = (e: unknown) => Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e));

  const runAlert = (a: ShopAlert) => {
    if (a.action.workOrderId && a.action.label === "Start job") {
      setStatus.mutate({ id: a.action.workOrderId, status: "in-progress" }, { onError: fail });
    } else if (a.id === "coi") {
      router.push("/shop/insights");
    } else {
      router.push(TAB_ROUTE[a.action.tab]);
    }
  };

  const waitingParts = o.filter((x) => x.status === "waiting-parts").length;
  const arrivingCount = arriving.reduce((n, [, list]) => n + list.length, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Title sub={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}>{shopName}</Title>

      <Row style={{ marginBottom: space.sm }}>
        <StatTile label="Board today" value={board[0].list.length} onPress={() => router.push("/shop/schedule")} />
        <StatTile label="Waiting on parts" value={waitingParts} tone={waitingParts ? "amber" : undefined} onPress={() => router.push("/shop/orders")} />
        <StatTile label="Arriving" value={arrivingCount} onPress={() => router.push("/shop/parts")} />
      </Row>
      <Row style={{ marginBottom: space.lg }}>
        <StatTile label="To invoice" value={money(cash.ready)} tone={cash.ready > 0 ? "amber" : undefined} onPress={() => router.push("/shop/orders")} />
        <StatTile label="Done this week" value={money(cash.week)} tone="green" onPress={() => router.push("/shop/revenue")} />
      </Row>

      <SectionTitle right={<Muted>{alerts.length === 0 ? "All clear" : `${alerts.length} item${alerts.length === 1 ? "" : "s"}`}</Muted>}>Needs you now</SectionTitle>
      {alerts.length === 0 ? (
        <Card><Muted>Nothing overdue, short or stuck.</Muted></Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {alerts.slice(0, 7).map((a, i) => (
            <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TONE[a.tone] }} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{a.text}</Text>
              <Pressable onPress={() => runAlert(a)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.navy }}>{a.action.label}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {won.length > 0 && (
        <LinkRow
          icon="trophy-outline"
          title={`${won.length} job${won.length === 1 ? "" : "s"} you won on Bosun`}
          sub="Not on the board yet. Open the job to put it on."
          onPress={() => router.push("/(vendor)/my-bids")}
          badge={<Badge tone="sky">{won.length}</Badge>}
        />
      )}

      <SectionTitle right={<Button title="Full schedule" tone="ghost" onPress={() => router.push("/shop/schedule")} />}>On the board</SectionTitle>
      {board.map((col) => (
        <View key={col.key} style={{ marginBottom: space.sm }}>
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted, marginBottom: space.xs }}>
            {col.label} · {col.list.length} job{col.list.length === 1 ? "" : "s"}
          </Text>
          {col.list.length === 0 ? (
            <Muted style={{ marginBottom: space.sm }}>Open. A good day to take a new job.</Muted>
          ) : (
            col.list.map((wo) => {
              const parts = partsProgress(wo.id, s);
              const partsNote = parts.total === 0 ? null : parts.problems ? "delivery problem" : parts.open ? `parts ${parts.total - parts.open}/${parts.total} in` : "parts in";
              return (
                <Card key={wo.id} style={{ padding: space.md }} onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: wo.id } })}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <Text style={{ width: 64, fontSize: 12, color: colors.muted }}>{hhmm(wo.scheduledStart)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "600", color: colors.text }} numberOfLines={1}>{wo.title || wo.number}</Text>
                      <Muted numberOfLines={1}>{[wo.boatLabel || wo.customerName, wo.bay, wo.assignedTo].filter(Boolean).join(" · ")}</Muted>
                      {partsNote && <Text style={{ fontSize: 11, fontWeight: "600", color: parts.problems ? colors.red : parts.open ? colors.amber : colors.green }}>{partsNote}</Text>}
                    </View>
                    <WorkOrderBadge status={wo.status} />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      ))}

      <SectionTitle right={<Button title="All parts" tone="ghost" onPress={() => router.push("/shop/parts")} />}>Arriving today</SectionTitle>
      {arriving.length === 0 ? (
        <Card><Muted>No deliveries due today.</Muted></Card>
      ) : (
        arriving.flatMap(([key, list]) =>
          list.map((sh) => (
            <Card key={sh.id} style={{ padding: space.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: colors.text }} numberOfLines={1}>{sh.description || sh.supplier || "Shipment"}</Text>
                  <Muted numberOfLines={1}>{key === "stock" ? "Shop stock" : sh.boatLabel || "Boat"}{sh.customerName ? ` · ${sh.customerName}` : ""}</Muted>
                  <View style={{ marginTop: 4 }}><ShipmentBadge status={sh.status} /></View>
                </View>
                <Button title="Check in" tone="primary" style={{ backgroundColor: colors.green, paddingVertical: 8 }} loading={receive.isPending && receive.variables === sh.id} onPress={() => receive.mutate(sh.id, { onError: fail })} />
              </View>
            </Card>
          )),
        )
      )}
    </ScrollView>
  );
}
