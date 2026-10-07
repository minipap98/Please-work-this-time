// Maintenance: what's due on the active boat, marked done here or matched from the Boat Log.
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { boatTitle, engineDisplay } from "@bosun/shared/boats/boats";
import { DISPLAY_GROUPS, badgeText, formatInterval, type DueStatus, type TaskStatus } from "@bosun/shared/maintenance/status";
import { useAddLogEntry } from "@/lib/boatLog";
import { useMyBoats } from "@/lib/boats";
import { useDueTasks, useMarkDone } from "@/lib/maintenance";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Empty, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { DateField, SectionTitle, StatTile, SwitchRow, formatDate, isIsoDate, todayIso } from "@/ui/pickers";

const TONE: Record<DueStatus, "red" | "amber" | "green" | "muted"> = { overdue: "red", "due-soon": "amber", ok: "green", never: "muted" };
const BAR: Record<DueStatus, string> = { overdue: colors.red, "due-soon": "#f59e0b", ok: colors.green, never: colors.border };

export default function Maintenance() {
  const router = useRouter();
  const { active, isLoading: boatsLoading } = useMyBoats();
  const due = useDueTasks(active);
  const [marking, setMarking] = useState<TaskStatus | null>(null);
  const [hoursEdit, setHoursEdit] = useState<string | null>(null);

  if (boatsLoading || due.isLoading) return <Loading />;
  if (!active) {
    return (
      <Screen>
        <Empty title="Add your boat first" body="The schedule comes from the boat's engines." />
        <Button title="Add a boat" onPress={() => router.push("/boat/new")} />
      </Screen>
    );
  }
  const { tasks, counts, plan } = due;
  const hasEngine = !!active.engine_make && !!active.engine_model;

  return (
    <Screen>
      <Title sub={engineDisplay(active) || "No engine on file"}>{boatTitle(active)}</Title>
      <Row style={{ marginBottom: space.md }}>
        <StatTile label="Overdue" value={counts.overdue} tone={counts.overdue ? "red" : "green"} />
        <StatTile label="Due soon" value={counts.dueSoon} tone={counts.dueSoon ? "amber" : "green"} />
        <StatTile label="Up to date" value={counts.ok} tone="green" />
      </Row>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600", color: colors.text }}>Engine hours</Text>
            <Muted>{due.currentHours != null ? `${due.currentHours} hrs on the clock` : "Not set. Add them to track hour-based items."}</Muted>
          </View>
          {hoursEdit === null ? (
            <Button title={due.currentHours != null ? "Update" : "Set"} tone="secondary" onPress={() => setHoursEdit(due.currentHours != null ? String(due.currentHours) : "")} />
          ) : null}
        </View>
        {hoursEdit !== null && (
          <View style={{ marginTop: space.md }}>
            <Field label="Current engine hours" value={hoursEdit} onChangeText={setHoursEdit} keyboardType="decimal-pad" autoFocus />
            <Row>
              <Button title="Cancel" tone="secondary" onPress={() => setHoursEdit(null)} style={{ flex: 1 }} />
              <Button
                title="Save"
                onPress={() => {
                  const n = parseFloat(hoursEdit);
                  due.setCurrentHours(Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null);
                  setHoursEdit(null);
                }}
                style={{ flex: 1 }}
              />
            </Row>
          </View>
        )}
      </Card>

      <Card style={{ borderColor: colors.sky, backgroundColor: colors.sky50 }}>
        <Text style={{ fontWeight: "700", color: colors.navy }}>{plan ? `Schedule: ${plan.engineLabel}` : "Get the manufacturer's schedule"}</Text>
        <Muted style={{ marginTop: 2, marginBottom: space.sm }}>
          {plan ? `${plan.tasks.length} engine items tracked${plan.source === "claude" ? ", from the owner's manual intervals" : ""}. Boat-wide items are always included.` : hasEngine ? "Bosun looks up the service intervals for your engines; you pick what to track and mark what's already been done." : "Add the engine make and model to the boat first."}
        </Muted>
        <Button title={plan ? "Review schedule" : "Set up the schedule"} tone="secondary" disabled={!hasEngine} onPress={() => router.push("/maintenance/plan")} />
      </Card>

      {DISPLAY_GROUPS.map((g) => {
        const list = tasks.filter((t) => g.categories.includes(t.category));
        if (!list.length) return null;
        return (
          <View key={g.name}>
            <SectionTitle>{g.name}</SectionTitle>
            {list.map((t) => (
              <Pressable key={t.id} onPress={() => setMarking(t)} style={({ pressed }) => [styles.task, pressed && { opacity: 0.85 }]}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: BAR[t.status], alignSelf: "stretch" }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: colors.text }}>{t.task}</Text>
                  <Muted>{formatInterval(t.intervalMonths, t.intervalHours)}{t.lastDate ? ` · last ${formatDate(t.lastDate)}${t.fromLog ? " (Boat Log)" : ""}` : ""}</Muted>
                </View>
                <Badge tone={TONE[t.status]}>{badgeText(t)}</Badge>
              </Pressable>
            ))}
          </View>
        );
      })}
      {tasks.length === 0 && <Empty title="No schedule yet" body="Set up the schedule above, or add the engine to the boat." />}

      {marking && <MarkDone task={marking} boatId={active.id} due={due} onClose={() => setMarking(null)} />}
    </Screen>
  );
}

function MarkDone({ task, boatId, due, onClose }: { task: TaskStatus; boatId: string; due: ReturnType<typeof useDueTasks>; onClose: () => void }) {
  const mark = useMarkDone();
  const addLog = useAddLogEntry();
  const [date, setDate] = useState(todayIso());
  const [hours, setHours] = useState(due.currentHours != null ? String(due.currentHours) : "");
  const [notes, setNotes] = useState("");
  const [toLog, setToLog] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!isIsoDate(date)) return setError("Enter the date as YYYY-MM-DD.");
    const h = parseFloat(hours);
    const engineHours = Number.isFinite(h) && h >= 0 ? h : undefined;
    setError(null);
    try {
      await mark.mutateAsync({ boatId, plan: due.plan, engine: due.engine!, engineTasks: due.engineTasks.filter((t) => !t.id.startsWith("general_")), record: { taskId: task.id, date, ...(engineHours != null ? { engineHours } : {}) } });
      if (toLog) await addLog.mutateAsync({ boatId, title: task.task, category: task.category, date, engineHours: engineHours ?? null, cost: null, vendorName: null, notes: notes.trim() || null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ padding: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginBottom: space.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.navy }}>{task.task}</Text>
              <Muted>{formatInterval(task.intervalMonths, task.intervalHours)}{task.notes ? ` · ${task.notes}` : ""}</Muted>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.navy} />
            </Pressable>
          </View>
          {task.lastDate && <Muted style={{ marginBottom: space.md }}>Last done {formatDate(task.lastDate)}{task.lastServiceHours != null ? ` at ${task.lastServiceHours} hrs` : ""}{task.nextDueDate ? ` · next ${formatDate(task.nextDueDate.toLocaleDateString("en-CA"))}` : ""}</Muted>}
          <DateField label="Done on" value={date} onChange={setDate} />
          <Field label="Engine hours" value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="Optional" />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
          <SwitchRow label="Add it to the Boat Log" hint="So it shows in the history and any shared link." value={toLog} onChange={setToLog} />
          <ErrorText>{error}</ErrorText>
          <Button title="Mark done" onPress={save} loading={mark.isPending || addLog.isPending} style={{ marginTop: space.md }} />
          <Button title="Cancel" tone="ghost" onPress={onClose} style={{ marginTop: space.sm }} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = {
  task: { flexDirection: "row" as const, alignItems: "center" as const, gap: space.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, marginBottom: space.sm },
};
