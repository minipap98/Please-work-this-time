// Parts inbound: shipments on their way, paired with the boat they're for, and the inbox
// address suppliers' emails get forwarded to.
import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { carrierTrackingUrl, parseShippingEmail, shipmentBoatKey, type PartsShipment } from "@bosun/shared/shop";
import { partsInboundAddress } from "@bosun/shared/shop/settings";
import { INBOUND_EMAIL_DOMAIN } from "@/lib/env";
import { useInventory, useReceiveShipment, useShipments, useShop, useShopRealtime, useShopSettings, useWorkOrders } from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Button, Card, Chip, Empty, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { ShipmentBadge, shortDate } from "@/ui/shop";

type Filter = "all" | "open" | "delivered";

export default function PartsInbound() {
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: shipments = [], isLoading, refetch, isRefetching } = useShipments(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);
  const { data: inventory = [] } = useInventory(vendorId);
  const { data: settings } = useShopSettings(vendorId);
  const receive = useReceiveShipment(vendorId);
  const [filter, setFilter] = useState<Filter>("open");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");

  const address = settings ? partsInboundAddress(settings.inboundEmailToken, INBOUND_EMAIL_DOMAIN) : null;
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const itemById = useMemo(() => new Map(inventory.map((i) => [i.id, i])), [inventory]);

  const shown = shipments.filter((s) => (filter === "all" ? true : filter === "open" ? !s.receivedAt : !!s.receivedAt));

  function pairedWith(s: PartsShipment): string {
    const key = shipmentBoatKey(s);
    if (key === "stock") return "Shop stock";
    const wo = s.workOrderId ? orderById.get(s.workOrderId) : undefined;
    if (wo) return `${wo.number} · ${wo.boatLabel || wo.customerName || wo.title}`;
    return [s.boatLabel, s.customerName].filter(Boolean).join(" · ");
  }

  function parse() {
    const parsed = parseShippingEmail(subject, body, from);
    const first = parsed.shipments[0];
    if (!first && !parsed.supplier) {
      Alert.alert("Nothing found", "No tracking number or supplier in that email. Add the shipment by hand instead.");
      return;
    }
    setPasteOpen(false);
    router.push({
      pathname: "/shop/shipment/[id]",
      params: {
        id: "new",
        supplier: parsed.supplier ?? "",
        description: parsed.orderNumber ? `Order ${parsed.orderNumber}` : "",
        carrier: first?.carrier ?? "Other",
        trackingNumber: first?.trackingNumber ?? "",
        status: parsed.status,
        eta: parsed.eta ?? "",
        emailSubject: subject,
        source: "email",
        woRef: parsed.workOrderRef ?? "",
      },
    });
  }

  if (shopLoading || isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Empty title="No shop yet" body="Finish setting up your shop to track parts." />
      </Screen>
    );
  }

  const header = (
    <View>
      <Card>
        <Text style={{ fontWeight: "600", color: colors.text }}>Your parts inbox</Text>
        <Muted style={{ marginTop: 4 }}>Forward supplier shipping emails here and they show up below, paired with the work order on the PO.</Muted>
        {address && <Text selectable style={{ color: colors.navy, fontWeight: "600", marginTop: space.sm }}>{address}</Text>}
        <Row style={{ marginTop: space.md, flexWrap: "wrap" }}>
          {address && <Button title="Share address" tone="secondary" onPress={() => Share.share({ message: address })} />}
          <Button title={pasteOpen ? "Close" : "Paste an email"} tone="ghost" onPress={() => setPasteOpen((v) => !v)} />
        </Row>
      </Card>
      {pasteOpen && (
        <Card>
          <Text style={{ fontWeight: "600", color: colors.text, marginBottom: space.sm }}>Paste a shipping email</Text>
          <Field label="Subject" value={subject} onChangeText={setSubject} autoCorrect={false} />
          <Field label="From" value={from} onChangeText={setFrom} autoCapitalize="none" autoCorrect={false} placeholder="orders@westmarine.com" />
          <Field label="Body" value={body} onChangeText={setBody} multiline placeholder="Paste the whole email" />
          <Button title="Read it" onPress={parse} disabled={!subject.trim() && !body.trim()} />
        </Card>
      )}
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        <Chip label="Open" selected={filter === "open"} onPress={() => setFilter("open")} />
        <Chip label="Delivered" selected={filter === "delivered"} onPress={() => setFilter("delivered")} />
        <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
        <View style={{ flex: 1 }} />
        <Button title="New shipment" tone="secondary" onPress={() => router.push({ pathname: "/shop/shipment/[id]", params: { id: "new" } })} />
      </Row>
    </View>
  );

  return (
    <Screen scroll={false}>
      <Title sub={`${shipments.filter((s) => !s.receivedAt).length} on the way`}>Parts inbound</Title>
      <FlatList
        data={shown}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Empty title={filter === "open" ? "Nothing on the way" : "No shipments"} body="Forward a supplier's shipping email or add one by hand." />}
        renderItem={({ item: s }) => {
          const url = s.trackingNumber ? carrierTrackingUrl(s.carrier, s.trackingNumber) : null;
          const stockItem = s.inventoryItemId ? itemById.get(s.inventoryItemId) : undefined;
          return (
            <Card onPress={() => router.push({ pathname: "/shop/shipment/[id]", params: { id: s.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={2}>{s.description || s.supplier || "Shipment"}</Text>
                <ShipmentBadge status={s.status} />
              </View>
              {s.description && s.supplier ? <Muted style={{ marginTop: 2 }}>{s.supplier}</Muted> : null}
              <Muted style={{ marginTop: 2 }}>{pairedWith(s)}</Muted>
              {stockItem && <Muted>{s.quantity} × {stockItem.name} into stock</Muted>}
              <Row style={{ marginTop: 4, flexWrap: "wrap" }}>
                {s.trackingNumber ? (
                  <Pressable onPress={() => url && Linking.openURL(url)} disabled={!url}>
                    <Text style={{ color: url ? colors.sky600 : colors.muted, fontSize: 13 }}>{s.carrier} · {s.trackingNumber}</Text>
                  </Pressable>
                ) : (
                  <Muted>{s.carrier}</Muted>
                )}
                {s.eta && <Muted>· ETA {shortDate(s.eta)}</Muted>}
                {s.receivedAt && <Muted>· Checked in {shortDate(s.receivedAt)}</Muted>}
              </Row>
              {!s.receivedAt && (
                <Button
                  title="Check in"
                  tone="secondary"
                  style={{ marginTop: space.md }}
                  loading={receive.isPending && receive.variables === s.id}
                  onPress={() => receive.mutate(s.id, { onError: (e) => Alert.alert("Couldn't check in", e instanceof Error ? e.message : String(e)) })}
                />
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
