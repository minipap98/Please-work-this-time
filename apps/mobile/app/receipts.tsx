// Emailed receipts waiting for a look: forward a receipt to the inbox address and it shows up here.
import { Alert, Text } from "react-native";
import { useRouter } from "expo-router";
import { receiptsAddress } from "@bosun/shared/boatLog/receipts";
import { useAuth } from "@/lib/auth";
import { useReceiptInbox, useResolveReceipt } from "@/lib/boatLog";

import { colors, space } from "@/lib/theme";
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen, Title } from "@/ui";
import { money } from "@/ui/pickers";

export default function Receipts() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useReceiptInbox();
  const resolve = useResolveReceipt();
  const address = receiptsAddress();
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  return (
    <Screen>
      <Title sub={address ? `Forward receipts from ${user?.email ?? "your account email"} to ${address} and they land here.` : undefined}>Emailed receipts</Title>
      {rows.length === 0 && <Empty title="Nothing waiting" body="Forwarded receipts show up here within a minute, read and ready to add to the Boat Log." />}
      {rows.map((r) => (
        <Card key={r.id}>
          <Text style={{ fontWeight: "600", color: colors.text }} numberOfLines={2}>{r.subject || r.attachmentName || "Receipt"}</Text>
          <Muted style={{ marginTop: 2 }}>From {r.fromEmail} · {new Date(r.receivedAt).toLocaleDateString()}</Muted>
          <Row style={{ marginTop: space.sm, flexWrap: "wrap" }}>
            {r.reading && <Badge tone="sky">Reading…</Badge>}
            {!!r.readError && <Badge tone="amber">Couldn't read it</Badge>}
            {r.extracted && <Badge tone="green">{r.extracted.shop ?? "Read"}{r.extracted.total != null ? ` · ${money(r.extracted.total)}` : ""}</Badge>}
          </Row>
          {!!r.readError && <Muted style={{ marginTop: 4 }}>{r.readError} You can still add it by hand.</Muted>}
          <Row style={{ marginTop: space.md }}>
            <Button title="Review" disabled={r.reading} onPress={() => router.push({ pathname: "/log/import", params: { receipt: r.id } })} style={{ flex: 1 }} />
            <Button
              title="Not a receipt"
              tone="secondary"
              onPress={() => Alert.alert("Dismiss this email?", undefined, [{ text: "Cancel" }, { text: "Dismiss", style: "destructive", onPress: () => resolve.mutate({ id: r.id, status: "dismissed" }) }])}
            />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
