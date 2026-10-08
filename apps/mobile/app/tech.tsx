// A crew member's day: only their jobs, the parts to pull, and start / done / note.
import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { occupiesDay, pullList, toLocalDateKey, type InventoryItem, type WorkOrder } from "@bosun/shared/shop";
import { useAuth } from "@/lib/auth";
import { useInventory, useMyCrewMemberships, useTechJobs, useTechUpdateJob, type CrewMembership } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, Chip, Loading, Muted, Row, Screen, Title } from "@/ui";
import { ListHeading, WorkOrderBadge, timeRange } from "@/ui/shop";

export default function TechToday() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { data: memberships = [], isLoading, refetch, isRefetching } = useMyCrewMemberships();
  const [pick, setPick] = useState(0);
  const m: CrewMembership | undefined = memberships[Math.min(pick, memberships.length - 1)];
  const jobsQ = useTechJobs(m);
  const jobs = jobsQ.data ?? [];
  const { data: inventory = [] } = useInventory(m?.vendorId ?? null);
  const update = useTechUpdateJob();
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return null;
    return jobs
      .filter((j) => [j.title, j.customerName, j.boatLabel, j.number].some((f) => f.toLowerCase().includes(needle)))
      .sort((a, b) => (b.scheduledStart ?? b.createdAt).localeCompare(a.scheduledStart ?? a.createdAt));
  }, [jobs, q]);

  const todayKey = toLocalDateKey(new Date().toISOString());
  const { today, upcoming, done } = useMemo(() => {
    const active = jobs.filter((j) => j.status !== "completed" && j.status !== "invoiced");
    const byStart = (a: WorkOrder, b: WorkOrder) => (a.scheduledStart ?? "9").localeCompare(b.scheduledStart ?? "9");
    return {
      today: active.filter((j) => !j.scheduledStart || occupiesDay(j, todayKey) || j.scheduledStart.slice(0, 10) < todayKey).sort(byStart),
      upcoming: active.filter((j) => j.scheduledStart && !occupiesDay(j, todayKey) && j.scheduledStart.slice(0, 10) > todayKey).sort(byStart),
      done: jobs.filter((j) => (j.status === "completed" || j.status === "invoiced") && j.completedAt?.slice(0, 10) === todayKey),
    };
  }, [jobs, todayKey]);

  const act = (order: WorkOrder, status?: WorkOrder["status"]) => {
    update.mutate(
      { order, status, note: notes[order.id] },
      {
        onSuccess: () => setNotes((n) => ({ ...n, [order.id]: "" })),
        onError: (e) => Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e)),
      },
    );
  };

  const card = (j: JobCardProps["job"], expanded: boolean) => (
    <JobCard
      key={j.id}
      job={j}
      inventory={inventory}
      expanded={expanded}
      onToggle={() => setOpen(open === j.id ? null : j.id)}
      note={notes[j.id] ?? ""}
      onNote={(v) => setNotes((n) => ({ ...n, [j.id]: v }))}
      busy={update.isPending}
      onStart={() => act(j, "in-progress")}
      onDone={() => act(j, "completed")}
      onSaveNote={() => act(j)}
    />
  );

  if (isLoading) return <Loading />;
  if (!m) {
    return (
      <Screen>
        <Title>You're not on a shop's crew yet</Title>
        <Muted>Ask your shop to invite {profile?.email ?? user?.email ?? "your email"} under Shop → Crew, then come back here.</Muted>
        <Button title="Go to my Bosun account" tone="secondary" onPress={() => router.replace("/(owner)")} style={{ marginTop: space.lg }} />
        <Button title="Sign out" tone="ghost" onPress={async () => { await signOut(); router.replace("/login"); }} />
      </Screen>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={isRefetching || jobsQ.isRefetching} onRefresh={() => { refetch(); jobsQ.refetch(); }} />}>
      <Title sub={`${m.techName} at ${m.shopName}`}>My jobs</Title>
      {memberships.length > 1 && (
        <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
          {memberships.map((x, i) => <Chip key={x.vendorId} label={x.shopName} selected={i === pick} onPress={() => setPick(i)} />)}
        </Row>
      )}
      <TextInput value={q} onChangeText={setQ} placeholder="Find a boat or customer in your jobs" placeholderTextColor={colors.faint} autoCorrect={false} style={styles.search} />

      {found ? (
        <>
          <ListHeading>{`Matches · ${found.length}`}</ListHeading>
          {found.length === 0 ? <Empty text={`No jobs of yours match "${q}".`} /> : found.slice(0, 12).map((j) => card(j, open === j.id))}
        </>
      ) : (
        <>
          {m.role === "manager" && (
            <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }} onPress={() => router.push("/shop/orders")}>
              <Text style={{ color: colors.white, fontWeight: "600" }}>Open the shop board</Text>
              <Text style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>Work orders, schedule, inventory and parts for {m.shopName}</Text>
            </Card>
          )}
          <ListHeading>{`Today · ${today.length} job${today.length === 1 ? "" : "s"}`}</ListHeading>
          {today.length === 0 ? <Empty text="Nothing assigned to you today." /> : today.map((j) => card(j, open === j.id || today.length === 1))}
          {upcoming.length > 0 && (
            <>
              <ListHeading>Coming up</ListHeading>
              {upcoming.slice(0, 6).map((j) => (
                <Card key={j.id} style={{ padding: space.md }}>
                  <Text style={{ fontWeight: "600", color: colors.text }}>{j.title}</Text>
                  <Muted>{timeRange(j.scheduledStart, j.scheduledEnd)} · {j.boatLabel || j.customerName}</Muted>
                </Card>
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <ListHeading>{`Done today · ${done.length}`}</ListHeading>
              {done.map((j) => (
                <Card key={j.id} style={{ padding: space.md, borderColor: "#a7f3d0" }}>
                  <Row><Text style={{ color: colors.green }}>✓</Text><Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{j.title}</Text></Row>
                </Card>
              ))}
            </>
          )}
        </>
      )}
      <Button title="Sign out" tone="ghost" style={{ marginTop: space.lg }} onPress={async () => { await signOut(); router.replace("/login"); }} />
    </ScrollView>
  );
}

function Empty({ text }: { text: string }) {
  return <Card style={{ borderStyle: "dashed" }}><Muted style={{ textAlign: "center" }}>{text}</Muted></Card>;
}

interface JobCardProps {
  job: WorkOrder;
  inventory: InventoryItem[];
  expanded: boolean;
  onToggle: () => void;
  note: string;
  onNote: (v: string) => void;
  busy: boolean;
  onStart: () => void;
  onDone: () => void;
  onSaveNote: () => void;
}

function JobCard({ job, inventory, expanded, onToggle, note, onNote, busy, onStart, onDone, onSaveNote }: JobCardProps) {
  const pulls = pullList(job, inventory);
  const started = job.status === "in-progress";
  return (
    <Card style={[{ padding: 0 }, started && { borderColor: colors.sky }]}>
      <Pressable onPress={onToggle} style={{ padding: space.md }}>
        <Row><WorkOrderBadge status={job.status} /><Muted>{timeRange(job.scheduledStart, job.scheduledEnd)}</Muted></Row>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 4 }}>{job.title}</Text>
        <Muted>
          {[job.boatLabel, job.customerName, job.bay].filter(Boolean).join(" · ")}
          {job.engineHours != null ? ` · ${job.engineHours} hrs` : ""}
        </Muted>
      </Pressable>
      {expanded && (
        <View style={{ padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, gap: space.md }}>
          {pulls.length > 0 && (
            <View>
              <Text style={styles.sub}>Parts to pull</Text>
              {pulls.map((p, i) => (
                <Row key={i} style={{ marginTop: 4 }}>
                  <Text style={styles.bin}>{p.bin || "—"}</Text>
                  <Text style={{ flex: 1, color: colors.text }}>{p.quantity} × {p.description}</Text>
                  {p.inStock !== null && p.inStock < p.quantity && <Text style={{ fontSize: 10, fontWeight: "700", color: colors.amber }}>only {p.inStock}</Text>}
                </Row>
              ))}
            </View>
          )}
          {!!job.description && (
            <View>
              <Text style={styles.sub}>Notes</Text>
              <Text style={{ color: colors.text }}>{job.description}</Text>
            </View>
          )}
          <View>
            <TextInput value={note} onChangeText={onNote} multiline placeholder="What you found or did (the owner sees this in their Boat Log)" placeholderTextColor={colors.faint} style={[styles.search, { minHeight: 64, textAlignVertical: "top", marginBottom: 0 }]} />
            {note.trim() ? <Button title="Save note" tone="ghost" disabled={busy} onPress={onSaveNote} /> : null}
          </View>
          <Row>
            <Button title={started ? "In progress" : "Start"} tone="secondary" disabled={busy || started} onPress={onStart} style={{ flex: 1 }} />
            <Button title="Mark done" disabled={busy} onPress={onDone} style={{ flex: 1, backgroundColor: colors.green }} />
          </Row>
        </View>
      )}
    </Card>
  );
}

const styles = {
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, marginBottom: space.md },
  sub: { fontSize: 12, fontWeight: "600" as const, color: colors.muted, marginBottom: 2 },
  bin: { fontSize: 11, fontFamily: "Menlo", backgroundColor: "#f1f5f9", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, minWidth: 48, textAlign: "center" as const, color: colors.text },
};
