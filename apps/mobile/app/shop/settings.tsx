// Shop settings: rates, bays, techs, QuickBooks item names and the parts inbox address.
import { useEffect, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { partsInboundAddress } from "@bosun/shared/shop/settings";
import { INBOUND_EMAIL_DOMAIN } from "@/lib/env";
import { useShop, useShopSettings, useUpdateShopSettings } from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Button, Card, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { Label, SectionTitle } from "@/ui/pickers";
import { NumberField } from "@/ui/shop";

function NameList({ label, items, onChange, placeholder, readOnly }: { label: string; items: string[]; onChange: (next: string[]) => void; placeholder: string; readOnly: boolean }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <Card>
      <Label>{label}</Label>
      {items.length === 0 && <Muted style={{ marginBottom: space.sm }}>None yet.</Muted>}
      {items.map((it) => (
        <View key={it} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{it}</Text>
          {!readOnly && (
            <Pressable onPress={() => onChange(items.filter((x) => x !== it))} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      ))}
      {!readOnly && (
        <Row style={{ marginTop: space.md, alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Field label="Add" value={draft} onChangeText={setDraft} placeholder={placeholder} autoCapitalize="words" onSubmitEditing={add} returnKeyType="done" />
          </View>
          <Button title="Add" tone="secondary" onPress={add} style={{ marginTop: 22 }} />
        </Row>
      )}
    </Card>
  );
}

export default function ShopSettingsScreen() {
  const router = useRouter();
  const { vendorId, managerMode, isLoading: shopLoading } = useShop();
  const { data: settings, isLoading } = useShopSettings(vendorId);
  const update = useUpdateShopSettings(vendorId);
  const [laborRate, setLaborRate] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [bays, setBays] = useState<string[]>([]);
  const [techs, setTechs] = useState<string[]>([]);
  const [qbLabor, setQbLabor] = useState("");
  const [qbParts, setQbParts] = useState("");
  const [qbFee, setQbFee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!settings || loaded) return;
    setLaborRate(settings.laborRate);
    setTaxRate(settings.taxRate);
    setBays(settings.bays);
    setTechs(settings.techs);
    setQbLabor(settings.qbLaborItem);
    setQbParts(settings.qbPartsItem);
    setQbFee(settings.qbFeeItem);
    setLoaded(true);
  }, [settings, loaded]);

  async function onSave() {
    setError(null);
    try {
      await update.mutateAsync({ laborRate, taxRate, bays, techs, qbLaborItem: qbLabor.trim(), qbPartsItem: qbParts.trim(), qbFeeItem: qbFee.trim() });
      Alert.alert("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  if (shopLoading || isLoading || (vendorId && !loaded)) return <Loading />;
  if (!vendorId || !settings) {
    return (
      <Screen>
        <Title>No shop yet</Title>
        <Muted>Finish setting up your shop first.</Muted>
      </Screen>
    );
  }
  const address = partsInboundAddress(settings.inboundEmailToken, INBOUND_EMAIL_DOMAIN);
  const ro = managerMode;

  return (
    <Screen>
      <Title sub={ro ? "Only the shop's own login can change these." : "Rates and names every work order starts from."}>Shop settings</Title>
      <Card>
        <NumberField label="Labor rate ($/hour)" value={laborRate} onChange={(n) => !ro && setLaborRate(n ?? 0)} />
        <NumberField label="Sales tax on parts (%)" value={taxRate} onChange={(n) => !ro && setTaxRate(n ?? 0)} hint="Applied to parts only, per work order." />
      </Card>
      <NameList label="Bays" items={bays} onChange={setBays} placeholder="Haul-out" readOnly={ro} />
      <NameList label="Techs on the board" items={techs} onChange={setTechs} placeholder="Marco" readOnly={ro} />
      <Card>
        <Label>QuickBooks item names</Label>
        <Muted style={{ marginBottom: space.sm }}>Exports use these; set up on the web under Shop → QuickBooks.</Muted>
        <Field label="Labor" value={qbLabor} onChangeText={setQbLabor} editable={!ro} />
        <Field label="Parts" value={qbParts} onChangeText={setQbParts} editable={!ro} />
        <Field label="Fees" value={qbFee} onChangeText={setQbFee} editable={!ro} />
      </Card>
      {!ro && (
        <>
          <ErrorText>{error}</ErrorText>
          <Button title="Save" onPress={onSave} loading={update.isPending} />
        </>
      )}

      <SectionTitle>Parts inbox</SectionTitle>
      <Card>
        <Muted>Forward supplier shipping emails to this address and they land in Parts inbound.</Muted>
        <Text selectable style={{ color: colors.navy, fontWeight: "600", marginTop: space.sm }}>{address}</Text>
        <Button title="Share address" tone="secondary" onPress={() => Share.share({ message: address })} style={{ marginTop: space.md }} />
      </Card>

      {!ro && (
        <Row style={{ marginTop: space.md, flexWrap: "wrap" }}>
          <Button title="Crew logins" tone="ghost" onPress={() => router.push("/crew")} />
          <Button title="Public profile" tone="ghost" onPress={() => router.push("/(vendor)/profile")} />
        </Row>
      )}
    </Screen>
  );
}
