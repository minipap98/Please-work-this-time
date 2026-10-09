// One boat: photo, details, the way into its log and schedule, and what Bosun knows about
// boats like it.
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { boatLabel, boatTitle, engineDisplay } from "@bosun/shared/boats/boats";
import { isTransferLive, maskEmail } from "@bosun/shared/boats/transfer";
import { patternScopeLabel, type InsightBoat } from "@bosun/shared/boats/insights";
import { communityKey, isGroupable } from "@bosun/shared/community/community";
import { summarizeLog } from "@bosun/shared/boatLog";
import { dueSummary } from "@bosun/shared/maintenance/status";
import { useBoatLog } from "@/lib/boatLog";
import { useModelInsights, useMyBoats, useSetBoatPhoto } from "@/lib/boats";
import { useDueTasks } from "@/lib/maintenance";
import { pickFromLibrary, preparePhoto, takePhoto } from "@/lib/photos";
import { useOutgoingTransfers } from "@/lib/transfers";
import { colors, radius, space } from "@/lib/theme";
import { FramedPhoto } from "@/screens/HeroBanner";
import { Badge, Button, Card, Loading, Muted, Row, Screen } from "@/ui";
import { LinkRow, SectionTitle } from "@/ui/pickers";

export default function BoatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { boats, active, isLoading, setActiveId } = useMyBoats();
  const boat = boats.find((b) => b.id === id) ?? null;
  const { data: log = [] } = useBoatLog(boat?.id);
  const { counts } = useDueTasks(boat);
  const setPhoto = useSetBoatPhoto();
  const insightBoat: InsightBoat | null = boat ? { make: boat.make, model: boat.model, engineMake: boat.engine_make, engineModel: boat.engine_model } : null;
  const insights = useModelInsights(insightBoat);
  const { data: transfers = [] } = useOutgoingTransfers();
  const pendingTransfer = transfers.find((t) => t.boatId === id && isTransferLive(t)) ?? null;

  if (isLoading) return <Loading />;
  if (!boat) return <Screen><Muted>That boat isn't on your account.</Muted></Screen>;

  async function changePhoto() {
    Alert.alert("Boat photo", undefined, [
      { text: "Take photo", onPress: () => pick(true) },
      { text: "Choose from library", onPress: () => pick(false) },
      ...(boat!.photo_url ? [{ text: "Remove photo", style: "destructive" as const, onPress: () => setPhoto.mutate({ boat: boat!, photo: null }) }] : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }
  async function pick(camera: boolean) {
    const shot = camera ? await takePhoto() : (await pickFromLibrary(1))[0];
    if (!shot) return;
    try {
      await setPhoto.mutateAsync({ boat: boat!, photo: await preparePhoto(shot) });
    } catch (e) {
      Alert.alert("Couldn't save the photo", e instanceof Error ? e.message : String(e));
    }
  }

  const summary = summarizeLog(log);
  const isActive = active?.id === boat.id;
  const known = insights.data?.known ?? [];
  const patterns = insights.data?.patterns ?? [];

  return (
    <Screen>
      {boat.photo_url ? <FramedPhoto boat={boat} style={{ borderRadius: radius.lg, marginBottom: space.md }} /> : null}
      <Row style={{ marginBottom: space.md }}>
        <Button title={boat.photo_url ? "Change photo" : "Add a photo"} tone="secondary" onPress={changePhoto} loading={setPhoto.isPending} style={{ flex: 1 }} />
        <Button title="Edit details" tone="secondary" onPress={() => router.push({ pathname: "/boat/edit", params: { id: boat.id } })} style={{ flex: 1 }} />
      </Row>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.navy }}>{boatTitle(boat)}</Text>
            {!!boat.name && <Muted>{boatLabel(boat)}</Muted>}
          </View>
          {isActive ? <Badge tone="green">Active</Badge> : <Button title="Make active" tone="ghost" onPress={() => setActiveId(boat.id)} />}
        </View>
        <View style={{ marginTop: space.md, gap: 6 }}>
          <Line label="Engines" value={engineDisplay(boat) || "Not set"} />
          <Line label="Type" value={boat.engine_type ?? "Not set"} />
          <Line label="Home port" value={boat.home_port ? `${boat.home_port}${boat.home_port_lat != null ? " · verified" : ""}` : "Not set"} />
        </View>
      </Card>

      <LinkRow icon="book-outline" title="Boat Log" sub={summary.entries ? `${summary.entries} service${summary.entries === 1 ? "" : "s"} on record · ${summary.verified} recorded by shops` : "Nothing logged yet"} onPress={() => router.push({ pathname: "/boat-log", params: { boat: boat.id } })} />
      <LinkRow icon="build-outline" title="Maintenance" sub={dueSummary(counts)} onPress={() => { if (!isActive) setActiveId(boat.id); router.push("/maintenance"); }} badge={counts.overdue + counts.dueSoon > 0 ? <Badge tone="amber">{counts.overdue + counts.dueSoon}</Badge> : undefined} />
      {isGroupable(boat.make, boat.model) && (
        <LinkRow icon="people-outline" title={`${boat.make} ${boat.model} owners`} sub="Threads from people who run the same boat" onPress={() => router.push({ pathname: "/owners/board", params: { make: communityKey(boat.make), model: communityKey(boat.model) } })} />
      )}
      <LinkRow icon="construct-outline" title="Post a job for this boat" sub="Shops nearby send line-item bids" onPress={() => router.push({ pathname: "/post", params: { boat: boat.id } })} />
      <LinkRow
        icon="swap-horizontal-outline"
        title="Transfer this boat"
        sub={pendingTransfer ? `Transfer pending · ${maskEmail(pendingTransfer.toEmail)}` : "Hand it to the new owner with its history"}
        onPress={() => router.push({ pathname: "/boat/transfer", params: { id: boat.id } })}
        badge={pendingTransfer ? <Badge tone="amber">Pending</Badge> : undefined}
      />

      {insightBoat && boat.make !== "Unknown" && boat.model !== "Unknown" && (
        <>
          <SectionTitle>Boats like yours</SectionTitle>
          {insights.isLoading && <Muted>Checking boats like yours…</Muted>}
          {insights.isError && <Muted>Model insights aren't available right now.</Muted>}
          {insights.data && known.length === 0 && patterns.length === 0 && <Muted>No known weak spots for the {boat.make} {boat.model} yet. As more owners log service, patterns show up here.</Muted>}
          {known.map((k) => {
            const p = patterns.find((x) => x.component.toLowerCase() === k.component.toLowerCase());
            return (
              <Card key={k.component} style={{ backgroundColor: colors.amber50, borderColor: "#fde68a" }}>
                <Text style={{ fontWeight: "700", color: colors.amber }}>Common failure point: {k.component.toLowerCase()}</Text>
                <Text style={{ color: colors.text, marginTop: 4, lineHeight: 19 }}>{k.summary}{k.advice ? ` ${k.advice}` : ""}</Text>
                <Muted style={{ marginTop: 6 }}>{k.source}{p ? ` · replaced on ${p.boats} of ${p.of_boats} ${patternScopeLabel(p, insightBoat)} on Bosun` : ""}</Muted>
              </Card>
            );
          })}
          {patterns
            .filter((p) => !known.some((k) => k.component.toLowerCase() === p.component.toLowerCase()))
            .map((p) => (
              <Card key={`${p.scope}-${p.component}`}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{p.component}</Text>
                <Muted style={{ marginTop: 2 }}>Replaced on {p.boats} of {p.of_boats} {patternScopeLabel(p, insightBoat)} on Bosun. Worth a look at your next service.</Muted>
              </Card>
            ))}
        </>
      )}
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: space.md }}>
      <Text style={{ width: 88, color: colors.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{value}</Text>
    </View>
  );
}
