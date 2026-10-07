// Review the schedule for the boat's engines: what to track, the intervals, what's already done.
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { boatTitle, engineDisplay } from "@bosun/shared/boats/boats";
import { planFromRows, planRows, type PlanRow } from "@bosun/shared/maintenance/plan";
import { useMyBoats } from "@/lib/boats";
import { useDueTasks, useRequestIntervals, useSaveServicePlan } from "@/lib/maintenance";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, ErrorText, Loading, Muted, Row, Screen, Title } from "@/ui";
import { DateField, SwitchRow } from "@/ui/pickers";

export default function PlanReview() {
  const router = useRouter();
  const { active, isLoading } = useMyBoats();
  const due = useDueTasks(active);
  const request = useRequestIntervals();
  const save = useSaveServicePlan();
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = !isLoading && !due.isLoading && !!active;

  // Known-done dates come from the merged picture (plan records and Boat Log matches).
  const knownDone = due.tasks.filter((t) => t.lastDate).map((t) => ({ taskId: t.id, date: t.lastDate!, ...(t.lastServiceHours != null ? { engineHours: t.lastServiceHours } : {}) }));

  function fetchSchedule() {
    if (!due.engine) return;
    setError(null);
    setRows(null);
    request.mutate(due.engine, {
      onSuccess: (tasks) => setRows(planRows(tasks, knownDone)),
      onError: (e) => setError(e instanceof Error ? e.message : "Couldn't get a schedule."),
    });
  }

  useEffect(() => {
    if (!ready || rows) return;
    if (due.plan) setRows(planRows(due.plan.tasks, knownDone));
    else fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return <Loading />;
  const set = (i: number, patch: Partial<PlanRow>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setTask = (i: number, patch: Partial<PlanRow["task"]>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, task: { ...r.task, ...patch } } : r)));
  const result = rows ? planFromRows(due.engine!, rows) : null;

  async function savePlan() {
    if (!result?.plan) return setError(result?.problem ?? "Nothing to save.");
    setError(null);
    try {
      await save.mutateAsync({ boatId: active!.id, plan: result.plan });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the schedule.");
    }
  }

  return (
    <Screen>
      <Title sub={engineDisplay(active!)}>{boatTitle(active!)}</Title>
      {request.isPending && (
        <Card>
          <Text style={{ fontWeight: "600", color: colors.navy }}>Looking up the manufacturer schedule…</Text>
          <Muted style={{ marginTop: 4 }}>Reading the service intervals for {engineDisplay(active!)}. About 10 seconds.</Muted>
        </Card>
      )}
      {error && !rows && (
        <Card>
          <ErrorText>{error}</ErrorText>
          <Button title="Try again" tone="secondary" onPress={fetchSchedule} />
        </Card>
      )}
      {rows && (
        <>
          <Muted style={{ marginBottom: space.md }}>Untick anything you don't want nagging about. Adjust intervals if your manual says otherwise. Mark what's already been done so the countdown starts from the right date.</Muted>
          {rows.map((r, i) => (
            <Card key={r.task.id} style={!r.track ? { opacity: 0.6 } : undefined}>
              <SwitchRow label={r.task.task} hint={r.task.notes ?? undefined} value={r.track} onChange={(v) => set(i, { track: v })} style={{ paddingVertical: 0 }} />
              {r.track && (
                <View style={{ marginTop: space.sm }}>
                  <Row>
                    <Text style={styles.small}>Every</Text>
                    <TextInput style={styles.num} value={r.task.intervalHours != null ? String(r.task.intervalHours) : ""} onChangeText={(v) => setTask(i, { intervalHours: v.trim() === "" ? null : Math.max(1, Math.round(Number(v)) || 0) })} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.faint} />
                    <Text style={styles.small}>hrs or</Text>
                    <TextInput style={styles.num} value={String(r.task.intervalMonths)} onChangeText={(v) => setTask(i, { intervalMonths: Math.max(1, Math.round(Number(v)) || 1) })} keyboardType="number-pad" />
                    <Text style={styles.small}>months</Text>
                  </Row>
                  <SwitchRow label="Already done" value={r.done} onChange={(v) => set(i, { done: v })} />
                  {r.done && (
                    <Row style={{ alignItems: "flex-start" }}>
                      <View style={{ flex: 2 }}>
                        <DateField label="On" value={r.date} onChange={(v) => set(i, { date: v })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 6 }}>At hrs</Text>
                        <TextInput style={[styles.num, { width: undefined }]} value={r.hours} onChangeText={(v) => set(i, { hours: v })} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.faint} />
                      </View>
                    </Row>
                  )}
                </View>
              )}
            </Card>
          ))}
          <ErrorText>{result?.problem ?? error}</ErrorText>
          <Button title="Save schedule" onPress={savePlan} loading={save.isPending} disabled={!result?.plan} />
          <Button title={due.plan ? "Look it up again" : "Get a fresh schedule"} tone="ghost" onPress={fetchSchedule} style={{ marginTop: space.sm }} />
        </>
      )}
    </Screen>
  );
}

const styles = {
  small: { fontSize: 13, color: colors.muted },
  num: { width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, textAlign: "right" as const, backgroundColor: colors.white, color: colors.text },
};
