// One customer: their details, the boats they bring in, and the work done for them.
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { boatLabel } from "@bosun/shared/shop";
import { useCustomers, useDeleteCustomer, useDeleteShopBoat, useSaveCustomer, useShop, useShopBoats, useWorkOrders, type BoatDraft } from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Button, Card, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { SectionTitle } from "@/ui/pickers";
import { NumberField, WorkOrderBadge, timeRange } from "@/ui/shop";

const blankBoat = (): BoatDraft => ({ name: "", year: null, make: "", model: "", engine: "", hullId: "", slip: "" });

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  const { data: customers = [], isLoading } = useCustomers(vendorId);
  const { data: allBoats = [] } = useShopBoats(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);
  const save = useSaveCustomer(vendorId);
  const deleteBoat = useDeleteShopBoat(vendorId);
  const deleteCustomer = useDeleteCustomer(vendorId);
  const customer = isNew ? undefined : customers.find((c) => c.id === id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [boats, setBoats] = useState<BoatDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);

  // Fill the form once the row is here; later realtime refreshes must not wipe what's being typed.
  useEffect(() => {
    if (!customer || loaded) return;
    setName(customer.name);
    setEmail(customer.email);
    setPhone(customer.phone);
    setNotes(customer.notes);
    setBoats(allBoats.filter((b) => b.customerId === customer.id).map(({ id: bid, name: n, year, make, model, engine, hullId, slip }) => ({ id: bid, name: n, year, make, model, engine, hullId, slip })));
    setLoaded(true);
  }, [customer, allBoats, loaded]);

  const setBoat = (i: number, patch: Partial<BoatDraft>) => setBoats((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  function removeBoat(i: number) {
    const b = boats[i];
    const drop = () => setBoats((bs) => bs.filter((_, j) => j !== i));
    if (!b.id) return drop();
    Alert.alert(`Remove ${boatLabel(b) || "this boat"}?`, "Work orders keep their boat label; only the file entry goes.", [
      { text: "Cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteBoat.mutate(b.id!, { onSuccess: drop, onError: (e) => Alert.alert("Couldn't remove", e instanceof Error ? e.message : String(e)) }) },
    ]);
  }

  async function onSave() {
    if (!name.trim()) {
      setError("A name is needed.");
      return;
    }
    setError(null);
    try {
      const { customerId } = await save.mutateAsync({ customer: { id: customer?.id, name, email, phone, notes }, boats });
      if (isNew) router.replace({ pathname: "/shop/customer/[id]", params: { id: customerId } });
      else Alert.alert("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  function onDelete() {
    if (!customer) return;
    Alert.alert(`Delete ${customer.name}?`, "Their boats on file go too. Work orders stay.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCustomer.mutate(customer.id, { onSuccess: () => router.back(), onError: (e) => Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e)) }) },
    ]);
  }

  if (shopLoading || (!isNew && isLoading)) return <Loading />;
  if (!isNew && !customer) {
    return (
      <Screen>
        <Title>Customer not found</Title>
        <Muted>It may have been removed on another device.</Muted>
      </Screen>
    );
  }

  const boatIds = new Set(boats.map((b) => b.id).filter(Boolean));
  const jobs = customer
    ? orders.filter((o) => (o.boatId && boatIds.has(o.boatId)) || o.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase())
    : [];

  return (
    <Screen>
      <Title sub={isNew ? "Goes on file for work orders and parts." : undefined}>{isNew ? "New customer" : customer!.name}</Title>
      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Gate code, preferred contact, how they pay…" />

      <SectionTitle right={<Button title="Add a boat" tone="ghost" onPress={() => setBoats((bs) => [...bs, blankBoat()])} />}>Boats</SectionTitle>
      {boats.length === 0 && <Muted style={{ marginBottom: space.md }}>No boats on file yet.</Muted>}
      {boats.map((b, i) => (
        <Card key={b.id ?? `new-${i}`}>
          <Text style={{ fontWeight: "600", color: colors.text, marginBottom: space.sm }}>{boatLabel(b) || "New boat"}</Text>
          <Field label="Name on the transom" value={b.name} onChangeText={(v) => setBoat(i, { name: v })} autoCapitalize="words" />
          <NumberField label="Year" value={b.year} onChange={(n) => setBoat(i, { year: n })} allowBlank placeholder="2019" />
          <Field label="Make" value={b.make} onChangeText={(v) => setBoat(i, { make: v })} autoCapitalize="words" placeholder="Grady-White" />
          <Field label="Model" value={b.model} onChangeText={(v) => setBoat(i, { model: v })} placeholder="Canyon 336" />
          <Field label="Engines" value={b.engine} onChangeText={(v) => setBoat(i, { engine: v })} placeholder="Twin Yamaha F300" />
          <Field label="Hull ID" value={b.hullId} onChangeText={(v) => setBoat(i, { hullId: v })} autoCapitalize="characters" autoCorrect={false} />
          <Field label="Slip / where she lives" value={b.slip} onChangeText={(v) => setBoat(i, { slip: v })} />
          <Button title="Remove boat" tone="ghost" onPress={() => removeBoat(i)} />
        </Card>
      ))}

      <ErrorText>{error}</ErrorText>
      <Button title={isNew ? "Save customer" : "Save"} onPress={onSave} loading={save.isPending} />

      {customer && (
        <>
          <SectionTitle right={<Button title="New work order" tone="ghost" onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: "new", customer: customer.id } })} />}>Work</SectionTitle>
          {jobs.length === 0 && <Muted style={{ marginBottom: space.md }}>No work orders for this customer yet.</Muted>}
          {jobs.map((o) => (
            <Card key={o.id} onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: o.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>{o.number} · {o.title}</Text>
                <WorkOrderBadge status={o.status} />
              </View>
              <Muted style={{ marginTop: 2 }}>{[timeRange(o.scheduledStart, o.scheduledEnd), o.boatLabel].filter(Boolean).join(" · ")}</Muted>
            </Card>
          ))}
          <Row style={{ marginTop: space.lg }}>
            <Button title="Delete customer" tone="ghost" onPress={onDelete} />
          </Row>
        </>
      )}
    </Screen>
  );
}
