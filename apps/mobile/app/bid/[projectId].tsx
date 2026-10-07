import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { bidProblem, usableLineItems, type BidLineItemInput } from "@bosun/shared/marketplace/bids";
import { useMyVendorProfile, useProject, useSubmitBid } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Button, Chip, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

type Line = { description: string; quantity: string; unitPrice: string };
const EMPTY: Line = { description: "", quantity: "1", unitPrice: "" };

function toItems(lines: Line[]): BidLineItemInput[] {
  return lines.map((l) => ({ description: l.description, quantity: parseFloat(l.quantity) || 1, unitPrice: parseFloat(l.unitPrice) || 0 }));
}

function plusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

export default function PlaceBid() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { data: project, isLoading } = useProject(projectId);
  const { data: shop } = useMyVendorProfile();
  const submit = useSubmitBid();
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY }]);
  const [message, setMessage] = useState("");
  const [expiryDays, setExpiryDays] = useState(14);
  const [error, setError] = useState<string | null>(null);

  const items = usableLineItems(toItems(lines));
  const total = items.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  async function send() {
    if (!project || !shop) return;
    const problem = bidProblem({ price: total, message });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      await submit.mutateAsync({ projectId: project.id, vendorProfileId: shop.id, price: total, message: message.trim(), expiryDate: plusDays(expiryDays), lineItems: items });
      Alert.alert("Bid sent", `${project.owner ?? "The owner"} will see it right away.`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the bid.");
    }
  }

  if (isLoading || !project) return <Loading />;
  if (!shop) {
    return (
      <Screen>
        <Title>Finish your shop profile first</Title>
        <Muted>Set up your shop from the Shop tab, then come back to bid.</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title sub={project.title}>Your bid</Title>
      <Text style={styles.h}>Line items</Text>
      {lines.map((l, i) => (
        <View key={i} style={{ marginBottom: space.sm }}>
          <Field label={i === 0 ? "Description" : `Item ${i + 1}`} value={l.description} onChangeText={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, description: v } : x)))} placeholder="Labor, impeller kit, …" />
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Qty" keyboardType="decimal-pad" value={l.quantity} onChangeText={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: v } : x)))} />
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Unit price ($)" keyboardType="decimal-pad" value={l.unitPrice} onChangeText={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: v } : x)))} placeholder="0" />
            </View>
            {lines.length > 1 && <Button title="Remove" tone="ghost" onPress={() => setLines(lines.filter((_, j) => j !== i))} />}
          </Row>
        </View>
      ))}
      <Button title="Add line" tone="secondary" onPress={() => setLines([...lines, { ...EMPTY }])} style={{ marginBottom: space.lg }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space.lg }}>
        <Text style={styles.h}>Total</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.navy }}>{money(total)}</Text>
      </View>

      <Field label="Message to the owner" multiline value={message} onChangeText={setMessage} placeholder="What's included, when you could start, anything they should know." />

      <Text style={styles.h}>Bid good for</Text>
      <Row style={{ marginBottom: space.lg }}>
        {[7, 14, 30].map((d) => (
          <Chip key={d} label={`${d} days`} selected={expiryDays === d} onPress={() => setExpiryDays(d)} />
        ))}
      </Row>

      <ErrorText>{error}</ErrorText>
      <Button title="Send bid" onPress={send} loading={submit.isPending} disabled={total <= 0 || !message.trim()} />
    </Screen>
  );
}

const styles = { h: { fontSize: 14, fontWeight: "700" as const, color: colors.navy, marginBottom: space.sm } };
