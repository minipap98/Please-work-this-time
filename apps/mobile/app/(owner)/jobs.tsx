import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isActiveProjectStatus } from "@bosun/shared/api";
import type { Project } from "@bosun/shared/marketplace/types";
import { useOwnerProjects } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Badge, Button, Card, Chip, Empty, Loading, Muted, Row, Screen, Title } from "@/ui";

type Tab = "active" | "completed" | "expired";

function statusTone(status: Project["status"]) {
  if (status === "in-progress") return "amber" as const;
  if (status === "completed") return "green" as const;
  if (status === "expired") return "muted" as const;
  return "sky" as const;
}

const unseen = (p: Project) => p.bids.filter((b) => b.seenAt === null).length;

export default function OwnerJobs() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useOwnerProjects();
  const [tab, setTab] = useState<Tab>("active");
  const projects = data ?? [];
  const visible = useMemo(
    () => projects.filter((p) => (tab === "active" ? isActiveProjectStatus(p.status) : p.status === tab)),
    [projects, tab],
  );
  const newBids = projects.reduce((n, p) => n + unseen(p), 0);

  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <Title sub={newBids > 0 ? `${newBids} new bid${newBids === 1 ? "" : "s"} to look at` : "Shops nearby compete for your work."}>Your jobs</Title>
      <Button title="Post a job" onPress={() => router.push("/post")} style={{ marginBottom: space.md }} />
      <Row style={{ marginBottom: space.md }}>
        {(["active", "completed", "expired"] as Tab[]).map((t) => (
          <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} selected={tab === t} onPress={() => setTab(t)} />
        ))}
      </Row>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Empty title={`No ${tab} jobs`} body={tab === "active" ? "Post a job and shops will bid." : undefined} />}
        renderItem={({ item: p }) => (
          <Card onPress={() => router.push({ pathname: "/project/[id]", params: { id: p.id } })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
              <Text style={{ fontWeight: "600", fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{p.title}</Text>
              <Badge tone={statusTone(p.status)}>{p.status === "in-progress" ? "In progress" : p.status === "completed" ? "Completed" : p.status === "expired" ? "Expired" : "Taking bids"}</Badge>
            </View>
            {p.boat && <Muted style={{ marginTop: 2 }}>{[p.boat.name, p.boat.make, p.boat.model].filter(Boolean).join(" · ")}</Muted>}
            <Muted style={{ marginTop: 2 }} >{p.description}</Muted>
            <Row style={{ marginTop: space.sm }}>
              <Text style={{ fontSize: 13, color: colors.muted }}>{p.bids.length} bid{p.bids.length === 1 ? "" : "s"}</Text>
              {unseen(p) > 0 && <Badge tone="sky">{unseen(p)} new</Badge>}
              <Text style={{ fontSize: 12, color: colors.faint, marginLeft: "auto" }}>{p.date}</Text>
            </Row>
          </Card>
        )}
      />
    </Screen>
  );
}
