// Live inventory: what's on the shelf, what's short, and quick +/- counts.
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isLowStock, type InventoryItem } from "@bosun/shared/shop";
import { useAdjustInventory, useInventory, useShop, useShopRealtime } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Chip, Empty, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { money } from "@/ui/shop";

function Counter({ item, onAdjust }: { item: InventoryItem; onAdjust: (delta: number) => void }) {
  const btn = (label: string, delta: number) => (
    <Pressable onPress={() => onAdjust(delta)} hitSlop={6} style={({ pressed }) => [styles.counterBtn, pressed && { backgroundColor: colors.sky50 }]}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.navy }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row>
      {btn("−", -1)}
      <Text style={{ fontSize: 22, fontWeight: "700", color: isLowStock(item) ? colors.amber : colors.text, minWidth: 40, textAlign: "center" }}>{item.qtyOnHand}</Text>
      {btn("+", 1)}
    </Row>
  );
}

export default function Inventory() {
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: items = [], isLoading, refetch, isRefetching } = useInventory(vendorId);
  const adjust = useAdjustInventory(vendorId);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => (!lowOnly || isLowStock(i)) && (!needle || [i.name, i.sku, i.category, i.binLocation, i.supplier].some((s) => s.toLowerCase().includes(needle))));
  }, [items, q, lowOnly]);
  const low = items.filter(isLowStock).length;

  if (shopLoading || isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Empty title="No shop yet" body="Finish setting up your shop to track stock." />
      </Screen>
    );
  }
  return (
    <Screen scroll={false}>
      <Title sub={`${items.length} part${items.length === 1 ? "" : "s"}${low ? ` · ${low} at reorder point` : ""}`}>Inventory</Title>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, SKU, bin or supplier" autoCorrect={false} />
      <Row style={{ marginBottom: space.md }}>
        <Chip label="All" selected={!lowOnly} onPress={() => setLowOnly(false)} />
        <Chip label={`Low stock${low ? ` (${low})` : ""}`} selected={lowOnly} onPress={() => setLowOnly(true)} />
        <View style={{ flex: 1 }} />
        <Button title="New part" tone="secondary" onPress={() => router.push({ pathname: "/shop/item/[id]", params: { id: "new" } })} />
      </Row>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Empty title={q || lowOnly ? "Nothing matches" : "No parts yet"} body={q || lowOnly ? undefined : "Add the parts you keep on the shelf. Work orders and received shipments move the counts."} />}
        renderItem={({ item }) => (
          <Card>
            <Pressable onPress={() => router.push({ pathname: "/shop/item/[id]", params: { id: item.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm, alignItems: "flex-start" }}>
                <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={2}>{item.name}{item.sku ? <Text style={{ color: colors.muted, fontWeight: "400" }}> · {item.sku}</Text> : null}</Text>
                {isLowStock(item) && <Badge tone="amber">Reorder</Badge>}
              </View>
              <Muted style={{ marginTop: 2 }}>{[item.category, item.binLocation && `Bin ${item.binLocation}`, item.supplier].filter(Boolean).join(" · ") || "No details"}</Muted>
            </Pressable>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.md }}>
              <View>
                <Muted>Reorder at {item.reorderPoint}</Muted>
                <Muted>{money(item.unitPrice)} each</Muted>
              </View>
              <Counter item={item} onAdjust={(delta) => adjust.mutate({ id: item.id, delta })} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = {
  counterBtn: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center" as const, justifyContent: "center" as const },
};
