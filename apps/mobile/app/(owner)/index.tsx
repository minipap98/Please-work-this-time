// Owner home: the active boat, what needs attention, and the latest jobs.
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isActiveProjectStatus } from "@bosun/shared/api";
import { summarizeLog } from "@bosun/shared/boatLog";
import { dueSummary } from "@bosun/shared/maintenance/status";
import { useAuth } from "@/lib/auth";
import { useBoatLog, useReceiptInbox } from "@/lib/boatLog";
import { useMyBoats } from "@/lib/boats";
import { useDueTasks } from "@/lib/maintenance";
import { useOwnerProjects } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { HeroBanner } from "@/screens/HeroBanner";
import { Badge, Button, Card, Loading, Muted, Row } from "@/ui";
import { LinkRow, SectionTitle, StatTile } from "@/ui/pickers";

export default function OwnerHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const { boats, active, isLoading: boatsLoading, setActiveId, refetch } = useMyBoats();
  const { data: projects = [], isRefetching, refetch: refetchProjects } = useOwnerProjects();
  const { data: log = [] } = useBoatLog(active?.id);
  const { counts } = useDueTasks(active);
  const { data: receipts = [] } = useReceiptInbox();

  if (boatsLoading) return <Loading />;

  const activeJobs = projects.filter((p) => isActiveProjectStatus(p.status));
  const newBids = projects.reduce((n, p) => n + p.bids.filter((b) => b.seenAt === null).length, 0);
  const summary = summarizeLog(log);
  const attention = counts.overdue + counts.dueSoon;
  const first = profile?.name?.split(" ")[0];

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchProjects(); }} />}
    >
      {first ? <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy, marginBottom: space.md }}>Hi {first}</Text> : null}
      <HeroBanner
        boat={active}
        boats={boats}
        location={profile?.location}
        onPress={() => (active ? router.push({ pathname: "/boat/[id]", params: { id: active.id } }) : router.push("/boat/new"))}
        onSwitch={setActiveId}
        onAddPhoto={() => router.push("/settings")}
      />

      <Row style={{ marginBottom: space.lg }}>
        <StatTile label="Active jobs" value={activeJobs.length} onPress={() => router.push("/(owner)/jobs")} />
        <StatTile label="New bids" value={newBids} tone={newBids > 0 ? "sky" : undefined} onPress={() => router.push("/(owner)/jobs")} />
        <StatTile label="Needs service" value={active ? attention : "—"} tone={attention > 0 ? "amber" : "green"} onPress={() => router.push("/maintenance")} />
      </Row>

      {active && (
        <>
          <LinkRow
            icon="build-outline"
            title="Maintenance"
            sub={dueSummary(counts)}
            onPress={() => router.push("/maintenance")}
            badge={attention > 0 ? <Badge tone="amber">{attention}</Badge> : undefined}
          />
          <LinkRow
            icon="book-outline"
            title="Boat Log"
            sub={summary.entries ? `${summary.entries} service${summary.entries === 1 ? "" : "s"} on record · ${summary.verified} recorded by shops` : "Every job on your boat, in one place"}
            onPress={() => router.push("/boat-log")}
          />
        </>
      )}
      {receipts.length > 0 && (
        <LinkRow
          icon="mail-unread-outline"
          title={`${receipts.length} emailed receipt${receipts.length === 1 ? "" : "s"} to review`}
          sub={receipts.some((r) => r.reading) ? "Still reading one…" : "Add them to the Boat Log or dismiss them."}
          onPress={() => router.push("/receipts")}
          badge={<Badge tone="sky">{receipts.length}</Badge>}
        />
      )}

      <SectionTitle right={<Button title="See all" tone="ghost" onPress={() => router.push("/(owner)/jobs")} />}>Your jobs</SectionTitle>
      {activeJobs.slice(0, 3).map((p) => (
        <Card key={p.id} onPress={() => router.push({ pathname: "/project/[id]", params: { id: p.id } })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
            <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>{p.title}</Text>
            <Badge tone={p.status === "in-progress" ? "amber" : "sky"}>{p.status === "in-progress" ? "In progress" : "Taking bids"}</Badge>
          </View>
          <Muted style={{ marginTop: 2 }}>{p.bids.length} bid{p.bids.length === 1 ? "" : "s"}{p.bids.some((b) => b.seenAt === null) ? " · new" : ""}</Muted>
        </Card>
      ))}
      {activeJobs.length === 0 && <Muted style={{ marginBottom: space.md }}>No open jobs. Describe the work and shops nearby will bid.</Muted>}
      <Button title="Post a job" onPress={() => router.push("/post")} />
    </ScrollView>
  );
}
