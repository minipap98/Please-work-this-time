// Boats someone is handing to this account: one card each, with Accept right there.
import { Alert, Text } from "react-native";
import { useRouter } from "expo-router";
import type { BoatTransfer } from "@bosun/shared/boats/transfer";
import { colors, space } from "@/lib/theme";
import { useIncomingTransfers, useTransferActions, useTransferPreview } from "@/lib/transfers";
import { Button, Card, Muted, Row } from "@/ui";

export function IncomingTransfers() {
  const { data: transfers = [] } = useIncomingTransfers();
  if (transfers.length === 0) return null;
  return (
    <>
      {transfers.map((t) => (
        <IncomingCard key={t.id} transfer={t} />
      ))}
    </>
  );
}

function IncomingCard({ transfer }: { transfer: BoatTransfer }) {
  const router = useRouter();
  const { data: preview } = useTransferPreview(transfer.token);
  const { accept } = useTransferActions();
  const b = preview?.boat;
  const label = b ? [b.year, b.make, b.model].filter((x) => x && x !== "Unknown").join(" ") || b.name : "A boat";

  async function onAccept() {
    try {
      await accept.mutateAsync(transfer.token);
      Alert.alert("It's yours", "The boat and its history are on your account now.");
      router.replace("/(owner)/boats");
    } catch (e) {
      Alert.alert("Couldn't accept", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card style={{ borderColor: colors.sky, backgroundColor: colors.sky50 }}>
      <Text style={{ fontWeight: "700", color: colors.navy }}>A boat is waiting for you</Text>
      <Muted style={{ marginTop: 2 }}>
        {label}
        {preview?.fromName ? ` from ${preview.fromName}` : ""}
        {preview ? ` · ${preview.entries} service${preview.entries === 1 ? "" : "s"} on record (${preview.verified} verified)` : ""}
      </Muted>
      <Row style={{ marginTop: space.md }}>
        <Button title="Accept" onPress={onAccept} loading={accept.isPending} style={{ flex: 1 }} />
        <Button title="Details" tone="secondary" onPress={() => router.push({ pathname: "/transfer/[token]", params: { token: transfer.token } })} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}
