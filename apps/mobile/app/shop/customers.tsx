// Customers on file: who the shop works for and the boats each one brings in.
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { boatLabel } from "@bosun/shared/shop";
import { useCustomers, useShop, useShopBoats, useShopRealtime, useWorkOrders } from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Button, Card, Empty, Field, Loading, Muted, Screen, Title } from "@/ui";

export default function Customers() {
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: customers = [], isLoading, refetch, isRefetching } = useCustomers(vendorId);
  const { data: boats = [] } = useShopBoats(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const boatIds = new Map<string, Set<string>>();
    for (const b of boats) boatIds.set(b.customerId, new Set([...(boatIds.get(b.customerId) ?? []), b.id]));
    return customers
      .map((c) => {
        const mine = boats.filter((b) => b.customerId === c.id);
        const ids = boatIds.get(c.id) ?? new Set<string>();
        const jobs = orders.filter((o) => (o.boatId && ids.has(o.boatId)) || o.customerName.trim().toLowerCase() === c.name.trim().toLowerCase()).length;
        return { c, boats: mine, jobs };
      })
      .filter(({ c, boats: mine }) => {
        if (!needle) return true;
        return [c.name, c.email, c.phone, ...mine.map(boatLabel)].some((s) => s.toLowerCase().includes(needle));
      });
  }, [customers, boats, orders, q]);

  if (shopLoading || isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Empty title="No shop yet" body="Finish setting up your shop to keep customers on file." />
      </Screen>
    );
  }
  return (
    <Screen scroll={false}>
      <Title sub={`${customers.length} on file`}>Customers</Title>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, email, phone or boat" autoCorrect={false} />
      <Button title="New customer" onPress={() => router.push({ pathname: "/shop/customer/[id]", params: { id: "new" } })} style={{ marginBottom: space.md }} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.c.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Empty title={q ? "No matches" : "No customers yet"} body={q ? undefined : "Add one here, or finish a work order and they go on file."} />}
        renderItem={({ item: { c, boats: mine, jobs } }) => (
          <Card onPress={() => router.push({ pathname: "/shop/customer/[id]", params: { id: c.id } })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
              <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{c.name}</Text>
              <Muted>{jobs} job{jobs === 1 ? "" : "s"}</Muted>
            </View>
            {(c.email || c.phone) && <Muted style={{ marginTop: 2 }}>{[c.email, c.phone].filter(Boolean).join(" · ")}</Muted>}
            <Muted style={{ marginTop: 4 }} numberOfLines={2}>{mine.length ? mine.map(boatLabel).join(" · ") : "No boats on file"}</Muted>
          </Card>
        )}
      />
    </Screen>
  );
}
