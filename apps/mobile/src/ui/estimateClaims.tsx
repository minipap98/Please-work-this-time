// Shop estimates the owner approved (or the shop finished) that aren't with one of their boats
// yet. The database files them by itself when the owner has exactly one boat; this card is the
// choice when they have several. Same shape as the web's EstimateClaims strip: nothing lands
// in the Boat Log until the owner picks.
import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { boatTitle, type BoatRow } from "@bosun/shared/boats/boats";
import { pendingClaimSummary, pickClaimBoat, type PendingEstimateClaim } from "@bosun/shared/shop/estimate";
import { useClaimPendingEstimate, useEstimateClaims } from "@/lib/boatLog";
import { colors, space } from "@/lib/theme";
import { Button, Card, Chip, Muted, Row } from "@/ui";

export function EstimateClaimsCard({ boats, activeId }: { boats: BoatRow[]; activeId: string | null | undefined }) {
  const { data } = useEstimateClaims();
  const file = useClaimPendingEstimate();
  const [picks, setPicks] = useState<Record<string, string>>({});
  // pickClaimBoat matches the shop's label against a name or a year/make/model string.
  const choices = useMemo(() => boats.map((b) => ({ id: b.id, name: b.name, label: boatTitle(b) })), [boats]);
  const items = data ?? [];
  if (items.length === 0 || boats.length === 0) return null;

  const boatFor = (c: PendingEstimateClaim) => picks[c.token] ?? pickClaimBoat(c, choices, activeId)?.id ?? boats[0].id;
  const fileIt = (c: PendingEstimateClaim) =>
    file.mutate(
      { token: c.token, boatId: boatFor(c) },
      {
        onSuccess: (r) => Alert.alert(r.filed ? "Filed to the Boat Log" : "Kept with your boat", r.filed ? undefined : "The shop's record is filed when they mark the job complete."),
        onError: (e) => Alert.alert("Couldn't file it", e instanceof Error ? e.message : String(e)),
      },
    );

  return (
    <Card style={{ borderColor: colors.green, backgroundColor: colors.green50 }}>
      <Text style={{ fontWeight: "700", color: colors.navy }}>{items.length === 1 ? "1 shop job waiting to be filed" : `${items.length} shop jobs waiting to be filed`}</Text>
      <Muted style={{ marginTop: 2 }}>Estimates you approved. Pick the boat each one is for and the shop's record goes into its Boat Log.</Muted>
      {items.map((c) => (
        <View key={c.token} style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontWeight: "600", color: colors.text }} numberOfLines={2}>
            {c.title} <Text style={{ color: colors.muted, fontWeight: "400" }}>· {c.number}</Text>
          </Text>
          <Muted style={{ marginTop: 2 }}>{pendingClaimSummary(c)}</Muted>
          {boats.length > 1 && (
            <Row style={{ marginTop: space.sm, flexWrap: "wrap" }}>
              {choices.map((b) => (
                <Chip key={b.id} label={b.label} selected={boatFor(c) === b.id} onPress={() => setPicks((p) => ({ ...p, [c.token]: b.id }))} />
              ))}
            </Row>
          )}
          <Button title={boats.length > 1 ? "File to this boat" : "File it"} onPress={() => fileIt(c)} loading={file.isPending} style={{ marginTop: space.sm }} />
        </View>
      ))}
    </Card>
  );
}
