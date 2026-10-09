// The seller's side of a handover: address the transfer to the buyer, then send them the link.
import { useState } from "react";
import { Alert, Share, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { boatTitle } from "@bosun/shared/boats/boats";
import { TRANSFER_DAYS, isTransferLive, transferUrl } from "@bosun/shared/boats/transfer";
import { useMyBoats } from "@/lib/boats";
import { SITE_URL } from "@/lib/env";
import { colors, space } from "@/lib/theme";
import { useOutgoingTransfers, useTransferActions } from "@/lib/transfers";
import { Button, Card, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { SwitchRow } from "@/ui/pickers";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function TransferBoat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { boats, isLoading } = useMyBoats();
  const { data: transfers = [], isLoading: transfersLoading } = useOutgoingTransfers();
  const actions = useTransferActions();
  const [email, setEmail] = useState("");
  const [includeCosts, setIncludeCosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boat = boats.find((b) => b.id === id) ?? null;
  const live = transfers.find((t) => t.boatId === id && isTransferLive(t)) ?? null;

  if (isLoading || transfersLoading) return <Loading />;
  if (!boat) return <Screen><Muted>That boat isn't on your account.</Muted></Screen>;

  async function create() {
    const to = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError("Enter the buyer's email address.");
      return;
    }
    setError(null);
    try {
      await actions.create.mutateAsync({ boatId: boat!.id, toEmail: to, includeCosts });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the transfer.");
    }
  }

  function cancel() {
    if (!live) return;
    Alert.alert("Cancel this transfer?", "The link stops working. You can start a new one any time.", [
      { text: "Keep it" },
      { text: "Cancel transfer", style: "destructive", onPress: () => actions.cancel.mutate(live.id, { onError: (e) => Alert.alert("Couldn't cancel", e instanceof Error ? e.message : String(e)) }) },
    ]);
  }

  if (live) {
    const url = transferUrl(SITE_URL, live.token);
    return (
      <Screen>
        <Title sub={boatTitle(boat)}>Transfer pending</Title>
        <Card>
          <Text style={{ fontWeight: "600", color: colors.text }}>Sent to {live.toEmail}</Text>
          <Muted style={{ marginTop: 4 }}>They sign in to Bosun with that email and accept. The link works until {when(live.expiresAt)}.</Muted>
          <Muted style={{ marginTop: 4 }}>{live.includeCosts ? "Costs and prices go with the log." : "Costs and prices stay with you."}</Muted>
        </Card>
        <Row>
          <Button title="Send link" onPress={() => Share.share({ message: `${boatTitle(boat)} on Bosun: ${url}`, url })} style={{ flex: 1 }} />
          <Button title="Cancel transfer" tone="secondary" onPress={cancel} loading={actions.cancel.isPending} style={{ flex: 1 }} />
        </Row>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title sub={boatTitle(boat)}>Transfer this boat</Title>
      <Muted style={{ marginBottom: space.lg }}>
        The boat moves to the buyer's Bosun account with its Boat Log, maintenance plan and photo. You keep your account, your jobs and your invoice files. The link lasts {TRANSFER_DAYS} days.
      </Muted>
      <Field label="Buyer's email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="buyer@example.com" hint="They must sign in with this exact address to accept." />
      <SwitchRow label="Include what I paid" hint="Costs and line-item prices on each service. Off keeps them private." value={includeCosts} onChange={setIncludeCosts} style={{ marginBottom: space.md }} />
      <ErrorText>{error}</ErrorText>
      <Button title="Create transfer" onPress={create} loading={actions.create.isPending} disabled={!email.trim()} />
    </Screen>
  );
}
