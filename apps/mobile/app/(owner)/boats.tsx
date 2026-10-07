// My Boats: every boat on the account, which one is active, and the way in to add one.
import { FlatList, Image, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { boatLabel, boatTitle, engineDisplay } from "@bosun/shared/boats/boats";
import { useMyBoats } from "@/lib/boats";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen } from "@/ui";

export default function MyBoats() {
  const router = useRouter();
  const { boats, active, isLoading, refetch, setActiveId } = useMyBoats();
  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <FlatList
        data={[...boats].reverse()}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListHeaderComponent={<Button title="Add a boat" tone="secondary" onPress={() => router.push("/boat/new")} style={{ marginBottom: space.md }} />}
        ListEmptyComponent={<Empty title="No boats yet" body="Add your boat to log its service, track maintenance and post jobs for it." />}
        renderItem={({ item: b }) => (
          <Card onPress={() => router.push({ pathname: "/boat/[id]", params: { id: b.id } })}>
            <View style={{ flexDirection: "row", gap: space.md }}>
              {b.photo_url ? (
                <Image source={{ uri: b.photo_url }} style={{ width: 72, height: 72, borderRadius: radius.sm }} />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="boat-outline" size={28} color={colors.navy} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }} numberOfLines={1}>{boatTitle(b)}</Text>
                {!!b.name && <Muted>{boatLabel(b)}</Muted>}
                {!!engineDisplay(b) && <Muted>{engineDisplay(b)}</Muted>}
                {!!b.home_port && <Muted numberOfLines={1}>{b.home_port}</Muted>}
              </View>
            </View>
            <Row style={{ marginTop: space.md, justifyContent: "space-between" }}>
              {b.id === active?.id ? <Badge tone="green">Active boat</Badge> : <Button title="Make active" tone="ghost" onPress={() => setActiveId(b.id)} />}
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Row>
          </Card>
        )}
      />
    </Screen>
  );
}
