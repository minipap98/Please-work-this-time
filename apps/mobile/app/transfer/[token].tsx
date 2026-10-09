// The buyer's side of a handover: what's being offered, and Accept when it's addressed to them.
import { useEffect } from "react";
import { Alert, Image, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { transferProblem } from "@bosun/shared/boats/transfer";
import { useAuth } from "@/lib/auth";
import { colors, radius, space } from "@/lib/theme";
import { useTransferActions, useTransferPreview } from "@/lib/transfers";
import { Button, Card, Loading, Muted, Screen, Title } from "@/ui";

export default function AcceptTransfer() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const { data: preview, isLoading } = useTransferPreview(token);
  const { accept } = useTransferActions();

  // Only the index gate redirects signed-out people; a deep link lands here directly.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user || isLoading) return <Loading />;
  if (!preview) {
    return (
      <Screen>
        <Title>Boat transfer</Title>
        <Muted>This transfer link isn't valid.</Muted>
      </Screen>
    );
  }

  const problem = transferProblem(preview, profile?.email);
  const b = preview.boat;
  const label = b ? [b.year, b.make, b.model].filter((x) => x && x !== "Unknown").join(" ") : "";
  const heading = b?.name?.trim() || label || "A boat";

  async function onAccept() {
    try {
      const boatId = await accept.mutateAsync(token!);
      Alert.alert("It's yours", "The boat and its history are on your account now.");
      router.replace({ pathname: "/boat/[id]", params: { id: boatId } });
    } catch (e) {
      Alert.alert("Couldn't accept", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen>
      {b?.photoUrl ? <Image source={{ uri: b.photoUrl }} style={{ width: "100%", height: 200, borderRadius: radius.lg, marginBottom: space.md }} /> : null}
      <Title sub={preview.fromName ? `From ${preview.fromName}` : undefined}>{heading}</Title>
      <Card>
        {!!b?.name && !!label && <Text style={{ color: colors.text }}>{label}</Text>}
        {!!b?.engine && <Muted style={{ marginTop: 2 }}>{b.engine}</Muted>}
        <Muted style={{ marginTop: space.sm }}>
          {preview.entries} service{preview.entries === 1 ? "" : "s"} on record · {preview.verified} recorded by shops
          {preview.includeCosts ? " · costs included" : ""}
        </Muted>
      </Card>
      {problem ? (
        <View>
          <Muted style={{ marginBottom: space.md }}>{problem}</Muted>
          <Button title="Sign out" tone="ghost" onPress={async () => { await signOut(); router.replace("/login"); }} />
        </View>
      ) : (
        <>
          <Muted style={{ marginBottom: space.md }}>Accepting moves the boat, its Boat Log, maintenance plan and photo to your account.</Muted>
          <Button title="Accept this boat" onPress={onAccept} loading={accept.isPending} />
        </>
      )}
    </Screen>
  );
}
