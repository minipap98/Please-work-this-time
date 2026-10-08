// One part on the shelf: what it is, where it lives, and what it costs.
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDeleteInventoryItem, useInventory, useSaveInventoryItem, useShop } from "@/lib/shop";
import { space } from "@/lib/theme";
import { Button, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { NumberField } from "@/ui/shop";

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  const { data: items = [], isLoading } = useInventory(vendorId);
  const save = useSaveInventoryItem(vendorId);
  const remove = useDeleteInventoryItem(vendorId);
  const item = isNew ? undefined : items.find((i) => i.id === id);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [bin, setBin] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState(0);
  const [reorder, setReorder] = useState(0);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!item || loaded) return;
    setSku(item.sku);
    setName(item.name);
    setCategory(item.category);
    setBin(item.binLocation);
    setSupplier(item.supplier);
    setQty(item.qtyOnHand);
    setReorder(item.reorderPoint);
    setCost(item.unitCost);
    setPrice(item.unitPrice);
    setLoaded(true);
  }, [item, loaded]);

  async function onSave() {
    if (!name.trim()) {
      setError("A name is needed.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({ id: item?.id, sku: sku.trim(), name: name.trim(), category: category.trim(), binLocation: bin.trim(), supplier: supplier.trim(), qtyOnHand: qty, reorderPoint: reorder, unitCost: cost, unitPrice: price });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  function onDelete() {
    if (!item) return;
    Alert.alert(`Delete ${item.name}?`, "Work order lines that used it keep their description.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(item.id, { onSuccess: () => router.back(), onError: (e) => Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e)) }) },
    ]);
  }

  if (shopLoading || (!isNew && isLoading)) return <Loading />;
  if (!isNew && !loaded) {
    if (!item) {
      return (
        <Screen>
          <Title>Part not found</Title>
          <Muted>It may have been removed on another device.</Muted>
        </Screen>
      );
    }
    return <Loading />;
  }

  return (
    <Screen>
      <Title>{isNew ? "New part" : item?.name}</Title>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Racor 500 fuel filter" />
      <Field label="SKU / part number" value={sku} onChangeText={setSku} autoCapitalize="characters" autoCorrect={false} />
      <Field label="Category" value={category} onChangeText={setCategory} placeholder="Filters" autoCapitalize="words" />
      <Field label="Bin location" value={bin} onChangeText={setBin} placeholder="A3" autoCapitalize="characters" autoCorrect={false} />
      <Field label="Supplier" value={supplier} onChangeText={setSupplier} placeholder="West Marine" autoCapitalize="words" />
      <NumberField label="Qty on hand" value={qty} onChange={(n) => setQty(n ?? 0)} hint={isNew ? undefined : "Use the +/- on the list for day-to-day counts; this overwrites."} />
      <NumberField label="Reorder point" value={reorder} onChange={(n) => setReorder(n ?? 0)} hint="Flagged on Today when the count drops to this." />
      <NumberField label="Unit cost" value={cost} onChange={(n) => setCost(n ?? 0)} placeholder="0.00" />
      <NumberField label="Unit price" value={price} onChange={(n) => setPrice(n ?? 0)} placeholder="0.00" hint="What goes on the work order." />
      <ErrorText>{error}</ErrorText>
      <Button title={isNew ? "Add part" : "Save"} onPress={onSave} loading={save.isPending} />
      {item && (
        <Row style={{ marginTop: space.lg }}>
          <Button title="Delete part" tone="ghost" onPress={onDelete} />
        </Row>
      )}
    </Screen>
  );
}
