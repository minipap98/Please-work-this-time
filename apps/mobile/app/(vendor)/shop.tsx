// The Shop hub: search the board, then everything Shop OS does on the phone.
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { isLowStock, occupiesDay, searchShop, toLocalDateKey } from "@bosun/shared/shop";
import { useInventory, useShipments, useShop, useShopRealtime, useWorkOrders } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Loading, Muted, Screen, Title } from "@/ui";
import { LinkRow } from "@/ui/pickers";
import { WorkOrderBadge } from "@/ui/shop";

export default function ShopHub() {
  const router = useRouter();
  const { vendorId, shopName, managerMode, isLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);
  const { data: shipments = [] } = useShipments(vendorId);
  const { data: inventory = [] } = useInventory(vendorId);
  const [q, setQ] = useState("");
  const hits = useMemo(() => searchShop(q, orders, shipments), [q, orders, shipments]);

  if (isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Title>No shop yet</Title>
        <Muted>Finish onboarding to open your shop.</Muted>
        <Button title="Set up my shop" onPress={() => router.push("/onboarding")} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  const todayKey = toLocalDateKey(new Date().toISOString());
  const open = orders.filter((o) => o.status !== "invoiced").length;
  const today = orders.filter((o) => o.status !== "invoiced" && occupiesDay(o, todayKey)).length;
  const low = inventory.filter(isLowStock).length;
  const inTransit = shipments.filter((s) => !s.receivedAt).length;
  const count = (n: number) => (n ? <Badge tone="muted">{n}</Badge> : undefined);

  return (
    <Screen>
      <Title sub={managerMode ? "You manage this shop's board." : "Work orders, schedule, stock and parts."}>{shopName}</Title>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: 12, marginBottom: space.md }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Customer, boat or WO number" placeholderTextColor={colors.faint} autoCorrect={false} style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text }} />
      </View>
      {q.trim().length >= 2 && (
        <Card style={{ padding: 0, marginBottom: space.lg }}>
          {hits.length === 0 && <Muted style={{ padding: space.md }}>Nothing on the board matches.</Muted>}
          {hits.map((h, i) => (
            <LinkRowPlain
              key={`${h.kind}-${h.label}-${i}`}
              first={i === 0}
              title={h.label}
              detail={h.detail}
              badge={h.order ? <WorkOrderBadge status={h.order.status} /> : <Badge tone="muted">{h.kind}</Badge>}
              onPress={() => (h.order ? router.push({ pathname: "/shop/order/[id]", params: { id: h.order.id } }) : router.push({ pathname: "/shop/orders", params: { q: h.query } }))}
            />
          ))}
        </Card>
      )}

      <LinkRow icon="document-text-outline" title="Work orders" sub={`${open} open`} badge={count(open)} onPress={() => router.push("/shop/orders")} />
      <LinkRow icon="calendar-outline" title="Schedule" sub={`${today} on the board today`} onPress={() => router.push("/shop/schedule")} />
      <LinkRow icon="people-outline" title="Customers" sub="Customers and boats on file" onPress={() => router.push("/shop/customers")} />
      <LinkRow icon="cube-outline" title="Inventory" sub={low ? `${low} part${low === 1 ? "" : "s"} at reorder point` : "Live stock"} badge={low ? <Badge tone="amber">{low}</Badge> : undefined} onPress={() => router.push("/shop/inventory")} />
      <LinkRow icon="airplane-outline" title="Parts inbound" sub={`${inTransit} on the way`} badge={count(inTransit)} onPress={() => router.push("/shop/parts")} />
      <LinkRow icon="stats-chart-outline" title="Insights" sub="Your price and win rate vs the market" onPress={() => router.push("/shop/insights")} />
      <LinkRow icon="cash-outline" title="Revenue" sub="Booked, invoiced and paid" onPress={() => router.push("/shop/revenue")} />
      {!managerMode && (
        <>
          <LinkRow icon="options-outline" title="Shop settings" sub="Rates, bays, techs, parts inbox" onPress={() => router.push("/shop/settings")} />
          <LinkRow icon="person-add-outline" title="Crew" sub="Tech and manager logins" onPress={() => router.push("/crew")} />
          <LinkRow icon="storefront-outline" title="Shop profile" sub="What owners see on your bids" onPress={() => router.push("/(vendor)/profile")} />
        </>
      )}
      <Muted style={{ marginTop: space.md }}>QuickBooks export lives on getbosun.app.</Muted>
    </Screen>
  );
}

function LinkRowPlain({ first, title, detail, badge, onPress }: { first: boolean; title: string; detail: string; badge: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }, pressed && { backgroundColor: colors.sky50 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "600", color: colors.text }} numberOfLines={1}>{title}</Text>
        <Muted numberOfLines={1}>{detail}</Muted>
      </View>
      {badge}
    </Pressable>
  );
}
