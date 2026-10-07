// One Boat Log entry in full: lines, notes, the invoice behind it.
import { useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isVerified } from "@bosun/shared/boatLog";
import { invoiceSignedUrl } from "@bosun/shared/boatLog/records";
import { lineAmount } from "@bosun/shared/shop";
import { useBoatLog, useDeleteLogEntry } from "@/lib/boatLog";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/theme";
import { Badge, Button, Card, Loading, Muted, Row, Screen, Title } from "@/ui";
import { formatDate, money } from "@/ui/pickers";

export default function LogEntryScreen() {
  const { id, boat: boatId } = useLocalSearchParams<{ id: string; boat: string }>();
  const router = useRouter();
  const { data: entries, isLoading } = useBoatLog(boatId);
  const remove = useDeleteLogEntry();
  const [opening, setOpening] = useState(false);
  const e = entries?.find((x) => x.id === id);
  if (isLoading) return <Loading />;
  if (!e) return <Screen><Muted>That entry is gone.</Muted></Screen>;
  const verified = isVerified(e);

  async function openInvoice() {
    setOpening(true);
    try {
      const url = await invoiceSignedUrl(supabase, e!.invoicePath!);
      if (url) await Linking.openURL(url);
      else Alert.alert("Couldn't open the invoice");
    } finally {
      setOpening(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this entry?", "It comes off the Boat Log and any shared history.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await remove.mutateAsync({ id: e!.id, boatId }); router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Title sub={`${formatDate(e.date)}${e.vendorName ? ` · ${e.vendorName}` : " · logged by you"}`}>{e.title}</Title>
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        {verified ? <Badge tone="green">{e.source === "bosun-job" ? "Verified · Bosun job" : "Verified by the shop"}</Badge> : <Badge tone="muted">Logged by owner</Badge>}
        {!!e.category && <Badge tone="sky">{e.category}</Badge>}
      </Row>
      <Card>
        <Fact label="Cost" value={e.cost != null ? money(e.cost) : "—"} />
        <Fact label="Engine hours" value={e.engineHours != null ? `${e.engineHours} hrs` : "—"} />
        <Fact label="Labor" value={e.laborHours != null ? `${e.laborHours} hrs` : "—"} />
      </Card>
      {e.lines.length > 0 && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: space.sm }}>Line items</Text>
          {e.lines.map((l, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm, paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Text style={{ flex: 1, color: colors.text }}>{l.quantity !== 1 ? `${l.quantity} × ` : ""}{l.description}</Text>
              <Text style={{ color: colors.text }}>{money(lineAmount(l))}</Text>
            </View>
          ))}
        </Card>
      )}
      {!!e.notes && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 4 }}>Notes</Text>
          <Text style={{ color: colors.text, lineHeight: 20 }}>{e.notes}</Text>
        </Card>
      )}
      {!!e.invoicePath && <Button title="View invoice" tone="secondary" onPress={openInvoice} loading={opening} style={{ marginBottom: space.md }} />}
      {!verified && (
        <Row>
          <Button title="Edit" tone="secondary" onPress={() => router.push({ pathname: "/log/new", params: { boat: boatId, id: e.id } })} style={{ flex: 1 }} />
          <Button title="Delete" tone="danger" onPress={confirmDelete} loading={remove.isPending} style={{ flex: 1 }} />
        </Row>
      )}
      {verified && <Muted>Verified entries were written by the shop's work order or the completed Bosun job, so they can't be changed.</Muted>}
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}
