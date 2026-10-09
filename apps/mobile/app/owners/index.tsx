// Owners like you: the groups my boats put me in, and the busiest groups across Bosun.
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { groupLabel, type CommunityGroup } from "@bosun/shared/community/community";
import { boardParams, useActiveGroups, useMyGroups } from "@/lib/community";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, Loading, Muted, Screen, Title } from "@/ui";
import { SectionTitle } from "@/ui/pickers";

function GroupCard({ g }: { g: CommunityGroup }) {
  const router = useRouter();
  return (
    <Card onPress={() => router.push({ pathname: "/owners/board", params: boardParams(g) })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="people-outline" size={18} color={colors.navy} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{groupLabel(g)}</Text>
          <Muted>{g.owners} owner{g.owners === 1 ? "" : "s"} on Bosun · {g.posts} thread{g.posts === 1 ? "" : "s"}</Muted>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </View>
    </Card>
  );
}

export default function OwnersHome() {
  const router = useRouter();
  const mine = useMyGroups();
  const active = useActiveGroups();
  if (mine.isLoading) return <Loading />;
  const myKeys = new Set((mine.data ?? []).map((g) => `${g.makeKey}/${g.modelKey ?? ""}`));
  const elsewhere = (active.data ?? []).filter((g) => !myKeys.has(`${g.makeKey}/${g.modelKey ?? ""}`));

  return (
    <Screen>
      <Title sub="Threads for people who own the same boat. The badge by a name shows what they run.">Owners like you</Title>
      <SectionTitle>Your groups</SectionTitle>
      {(mine.data ?? []).map((g) => <GroupCard key={`${g.makeKey}/${g.modelKey ?? ""}`} g={g} />)}
      {(mine.data ?? []).length === 0 && (
        <Card>
          <Muted>Add a boat and you're in its owners' group.</Muted>
          <Button title="Add a boat" tone="secondary" onPress={() => router.push("/boat/new")} style={{ marginTop: space.md }} />
        </Card>
      )}
      {elsewhere.length > 0 && (
        <>
          <SectionTitle>Where the talk is</SectionTitle>
          {elsewhere.map((g) => <GroupCard key={`${g.makeKey}/${g.modelKey ?? ""}`} g={g} />)}
        </>
      )}
    </Screen>
  );
}
