// Update the engine hours without logging work: one number and a date, into the Boat Log.
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { summarizeLog } from "@bosun/shared/boatLog";
import { hoursReadingEntry, hoursReadingProblem } from "@bosun/shared/boatLog/records";
import { useAddLogEntry, useBoatLog } from "@/lib/boatLog";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/ui";
import { DateField, isIsoDate, todayIso } from "@/ui/pickers";

export default function UpdateHours() {
  const { boat: boatId } = useLocalSearchParams<{ boat: string }>();
  const router = useRouter();
  const { data: entries = [] } = useBoatLog(boatId);
  const add = useAddLogEntry();
  const last = summarizeLog(entries).latestEngineHours;
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const n = parseFloat(hours.replace(/,/g, ""));
    const problem = hoursReadingProblem(Number.isFinite(n) ? n : null, last) ?? (isIsoDate(date) ? null : "Pick a date.");
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      await add.mutateAsync(hoursReadingEntry(boatId, n, date));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  return (
    <Screen>
      <Title sub={last != null ? `Last recorded: ${last} hours` : "Nothing recorded yet"}>Engine hours</Title>
      <Field label="Hours on the meter" value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder={last != null ? String(last) : "412"} autoFocus />
      <DateField label="As of" value={date} onChange={setDate} />
      <Muted style={{ marginBottom: 16 }}>Goes into the Boat Log as a reading. Maintenance uses the newest hours to tell you what's due.</Muted>
      <ErrorText>{error}</ErrorText>
      <Button title="Save hours" onPress={save} loading={add.isPending} disabled={!hours.trim()} />
    </Screen>
  );
}
