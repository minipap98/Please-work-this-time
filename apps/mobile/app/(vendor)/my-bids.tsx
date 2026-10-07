import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Bid, Project } from "@bosun/shared/marketplace/types";
import { useMyVendorProfile, useVendorBidProjects, useWithdrawBid } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen, Title } from "@/ui";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

type State = "submitted" | "accepted" | "completed" | "lost" | "expired" | "withdrawn" | "declined";

function stateOf(bid: Bid, project: Project): State {
  if (bid.withdrawnAt) return "withdrawn";
  if (project.chosenBidId === bid.id) return project.status === "completed" ? "completed" : "accepted";
  if (bid.rejected) return "declined";
  if (project.status === "expired") return "expired";
  if (project.status === "completed" || project.status === "in-progress") return "lost";
  return "submitted";
}

const TONE: Record<State, "sky" | "green" | "amber" | "red" | "muted"> = { submitted: "sky", accepted: "green", completed: "green", lost: "muted", expired: "muted", withdrawn: "muted", declined: "red" };

export default function MyBids() {
  const router = useRouter();
  const { data: shop } = useMyVendorProfile();
  const { data: projects = [], isLoading, refetch, isRefetching } = useVendorBidProjects(shop?.id);
  const withdraw = useWithdrawBid();
  const rows = projects.flatMap((project) => {
    const bid = project.bids.find((b) => b.vendorProfileId === shop?.id);
    return bid ? [{ project, bid }] : [];
  });

  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <Title sub={`${rows.length} bid${rows.length === 1 ? "" : "s"}`}>My bids</Title>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.bid.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Empty title="No bids yet" body="Find a job under Jobs near you." />}
        renderItem={({ item: { project, bid } }) => {
          const state = stateOf(bid, project);
          return (
            <Card onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{project.title}</Text>
                <Text style={{ fontWeight: "700", color: colors.navy }}>{money(bid.price)}</Text>
              </View>
              <Row style={{ marginTop: 4 }}>
                <Badge tone={TONE[state]}>{state[0].toUpperCase() + state.slice(1)}</Badge>
                <Muted>Submitted {bid.submittedDate}</Muted>
              </Row>
              {state === "accepted" && project.booking && <Muted style={{ marginTop: space.sm }}>Window: {String(project.booking.week)} · {String(project.booking.time)}</Muted>}
              <Row style={{ marginTop: space.md }}>
                <Button title="Messages" tone="ghost" onPress={() => router.push({ pathname: "/thread/[bidId]", params: { bidId: bid.id } })} />
                {state === "submitted" && (
                  <Button
                    title="Withdraw"
                    tone="ghost"
                    onPress={() =>
                      Alert.alert("Withdraw this bid?", "The owner will see it as withdrawn. You can't bid on this job again from the app.", [
                        { text: "Keep it" },
                        { text: "Withdraw", style: "destructive", onPress: () => withdraw.mutate(bid.id) },
                      ])
                    }
                  />
                )}
              </Row>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
