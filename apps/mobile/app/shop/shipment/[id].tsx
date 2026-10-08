// One shipment: who sent it, how it's travelling, and which boat (or the shelf) it's for.
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SHIPMENT_STATUSES, carrierTrackingUrl, matchWorkOrderRef, type Carrier, type ShipmentStatus } from "@bosun/shared/shop";
import { blankShipment } from "@bosun/shared/shop/drafts";
import { useDeleteShipment, useInventory, useSaveShipment, useShipments, useShop, useWorkOrders, type ShipmentDraft } from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Button, Chip, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { DateField, Label, Select } from "@/ui/pickers";
import { NumberField } from "@/ui/shop";

const CARRIERS: Carrier[] = ["UPS", "FedEx", "USPS", "DHL", "Other"];
type Target = "wo" | "boat" | "stock";

type Params = {
  id: string;
  wo?: string;
  supplier?: string;
  description?: string;
  carrier?: string;
  trackingNumber?: string;
  status?: string;
  eta?: string;
  emailSubject?: string;
  source?: string;
  woRef?: string;
};

export default function ShipmentScreen() {
  const p = useLocalSearchParams<Params>();
  const isNew = p.id === "new";
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  const { data: shipments = [], isLoading } = useShipments(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);
  const { data: inventory = [] } = useInventory(vendorId);
  const save = useSaveShipment(vendorId);
  const remove = useDeleteShipment(vendorId);
  const existing = isNew ? undefined : shipments.find((s) => s.id === p.id);

  const [d, setD] = useState<ShipmentDraft>(blankShipment);
  const [target, setTarget] = useState<Target>("stock");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const set = <K extends keyof ShipmentDraft>(k: K, v: ShipmentDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const openOrders = useMemo(() => orders.filter((o) => o.status !== "invoiced"), [orders]);
  const orderLabel = (o: (typeof orders)[number]) => `${o.number} · ${o.title}`;

  const linkOrder = (id: string | null) => {
    const wo = id ? orders.find((o) => o.id === id) : undefined;
    setD((prev) => ({ ...prev, workOrderId: wo?.id ?? null, boatLabel: wo?.boatLabel ?? prev.boatLabel, customerName: wo?.customerName ?? prev.customerName }));
  };

  // Seed once: from the saved row, or from the params a parsed email / work order passed in.
  useEffect(() => {
    if (loaded) return;
    if (!isNew) {
      if (!existing) return;
      const { id: _id, createdAt: _c, receivedAt: _r, ...rest } = existing;
      setD({ ...rest, id: existing.id });
      setTarget(existing.workOrderId ? "wo" : existing.boatLabel ? "boat" : "stock");
      setLoaded(true);
      return;
    }
    if (orders.length === 0 && (p.wo || p.woRef)) return; // wait for orders so the link resolves
    const seed = blankShipment();
    if (p.supplier) seed.supplier = p.supplier;
    if (p.description) seed.description = p.description;
    if (p.carrier && CARRIERS.includes(p.carrier as Carrier)) seed.carrier = p.carrier as Carrier;
    if (p.trackingNumber) seed.trackingNumber = p.trackingNumber;
    if (p.status && SHIPMENT_STATUSES.some((s) => s.value === p.status)) seed.status = p.status as ShipmentStatus;
    if (p.eta) seed.eta = p.eta;
    if (p.emailSubject) seed.emailSubject = p.emailSubject;
    if (p.source === "email") seed.source = "email";
    const wo = p.wo ? orders.find((o) => o.id === p.wo) : p.woRef ? matchWorkOrderRef(p.woRef, orders) : null;
    if (wo) {
      seed.workOrderId = wo.id;
      seed.boatLabel = wo.boatLabel;
      seed.customerName = wo.customerName;
      setTarget("wo");
    }
    setD(seed);
    setLoaded(true);
  }, [loaded, isNew, existing, orders, p]);

  function pickTarget(t: Target) {
    setTarget(t);
    if (t === "stock") setD((prev) => ({ ...prev, workOrderId: null, boatLabel: "", customerName: "" }));
    if (t === "boat") setD((prev) => ({ ...prev, workOrderId: null }));
  }

  async function onSave() {
    if (!d.supplier.trim() && !d.description.trim() && !d.trackingNumber.trim()) {
      setError("Give it a supplier, a description or a tracking number.");
      return;
    }
    if (target === "wo" && !d.workOrderId) {
      setError("Pick the work order, or switch to a boat or shop stock.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({ ...d, supplier: d.supplier.trim(), description: d.description.trim(), trackingNumber: d.trackingNumber.trim(), boatLabel: d.boatLabel.trim(), customerName: d.customerName.trim() });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  function onDelete() {
    if (!existing) return;
    Alert.alert("Delete this shipment?", undefined, [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(existing.id, { onSuccess: () => router.back(), onError: (e) => Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e)) }) },
    ]);
  }

  if (shopLoading || (!isNew && isLoading)) return <Loading />;
  if (!isNew && !existing) {
    return (
      <Screen>
        <Title>Shipment not found</Title>
        <Muted>It may have been removed on another device.</Muted>
      </Screen>
    );
  }
  if (!loaded) return <Loading />;

  const url = d.trackingNumber ? carrierTrackingUrl(d.carrier, d.trackingNumber) : null;
  const linked = d.workOrderId ? orders.find((o) => o.id === d.workOrderId) : undefined;
  const stockItem = d.inventoryItemId ? inventory.find((i) => i.id === d.inventoryItemId) : undefined;

  return (
    <Screen>
      <Title sub={existing?.receivedAt ? "Checked in." : existing?.source === "email" ? "From a forwarded email." : undefined}>{isNew ? "New shipment" : d.description || d.supplier || "Shipment"}</Title>
      <Field label="Supplier" value={d.supplier} onChangeText={(v) => set("supplier", v)} placeholder="West Marine" autoCapitalize="words" />
      <Field label="What's in it" value={d.description} onChangeText={(v) => set("description", v)} placeholder="Impeller kit, 2 × fuel filters" />
      <Label>Carrier</Label>
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        {CARRIERS.map((c) => (
          <Chip key={c} label={c} selected={d.carrier === c} onPress={() => set("carrier", c)} />
        ))}
      </Row>
      <Field label="Tracking number" value={d.trackingNumber} onChangeText={(v) => set("trackingNumber", v)} autoCapitalize="characters" autoCorrect={false} hint="Saving with a tracking number already on file updates that shipment instead." />
      {url && <Button title="Open tracking" tone="ghost" onPress={() => Linking.openURL(url)} style={{ alignSelf: "flex-start", marginBottom: space.md }} />}
      <Label>Status</Label>
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        {SHIPMENT_STATUSES.map((s) => (
          <Chip key={s.value} label={s.label} selected={d.status === s.value} onPress={() => set("status", s.value)} />
        ))}
      </Row>
      <DateField label="Expected" value={d.eta ?? ""} onChange={(v) => set("eta", v || null)} />

      <Label>Which boat is it for?</Label>
      <Row style={{ marginBottom: space.md }}>
        <Chip label="Work order" selected={target === "wo"} onPress={() => pickTarget("wo")} />
        <Chip label="A boat" selected={target === "boat"} onPress={() => pickTarget("boat")} />
        <Chip label="Shop stock" selected={target === "stock"} onPress={() => pickTarget("stock")} />
      </Row>
      {target === "wo" && (
        <Select
          label="Work order"
          value={linked ? orderLabel(linked) : ""}
          options={openOrders.map(orderLabel)}
          onChange={(v) => linkOrder(openOrders.find((o) => orderLabel(o) === v)?.id ?? null)}
          hint={linked ? [linked.boatLabel, linked.customerName].filter(Boolean).join(" · ") || "Boat and customer follow the order." : "Boat and customer follow the order."}
        />
      )}
      {target === "boat" && (
        <>
          <Field label="Boat" value={d.boatLabel} onChangeText={(v) => set("boatLabel", v)} placeholder="2019 Grady-White 236 · Reel Time" />
          <Field label="Customer" value={d.customerName} onChangeText={(v) => set("customerName", v)} autoCapitalize="words" />
        </>
      )}
      {target === "stock" && <Muted style={{ marginBottom: space.md }}>Goes on the shelf, not to a boat.</Muted>}

      <Select
        label="Goes into stock (optional)"
        value={stockItem?.name ?? ""}
        options={inventory.map((i) => i.name)}
        placeholder="No inventory item"
        onChange={(v) => set("inventoryItemId", inventory.find((i) => i.name === v)?.id ?? null)}
        hint="Checking it in adds the quantity to that part's count."
      />
      {d.inventoryItemId && (
        <>
          <NumberField label="Quantity" value={d.quantity} onChange={(n) => set("quantity", n ?? 0)} />
          <Button title="Clear inventory link" tone="ghost" onPress={() => set("inventoryItemId", null)} style={{ alignSelf: "flex-start", marginBottom: space.md }} />
        </>
      )}

      <ErrorText>{error}</ErrorText>
      <Button title={isNew ? "Add shipment" : "Save"} onPress={onSave} loading={save.isPending} />
      {existing && (
        <Row style={{ marginTop: space.lg }}>
          <Button title="Delete shipment" tone="ghost" onPress={onDelete} />
          {existing.emailSubject ? <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }} numberOfLines={1}>“{existing.emailSubject}”</Text> : null}
        </Row>
      )}
    </Screen>
  );
}
