// Log work by hand, or edit an entry you logged. Shop-verified entries can't be edited.
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isVerified, type LogEntry } from "@bosun/shared/boatLog";
import { LOG_CATEGORIES } from "@bosun/shared/boatLog/records";
import { useAddLogEntry, useBoatLog, useUpdateLogEntry } from "@/lib/boatLog";
import { Button, ErrorText, Field, Loading, Muted, Screen, Title } from "@/ui";
import { DateField, Select, isIsoDate, todayIso } from "@/ui/pickers";

const num = (s: string): number | null => {
  const n = parseFloat(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export default function LogEntryForm() {
  const { boat: boatId, id } = useLocalSearchParams<{ boat: string; id?: string }>();
  const { data: entries, isLoading } = useBoatLog(id ? boatId : undefined);
  const existing = id ? entries?.find((e) => e.id === id) : undefined;
  if (id && isLoading) return <Loading />;
  if (id && !existing) return <Screen><Muted>That entry is gone.</Muted></Screen>;
  if (existing && isVerified(existing)) return <Screen><Muted>Shop-verified entries can't be edited.</Muted></Screen>;
  return <EntryForm key={existing?.id ?? "new"} boatId={boatId} existing={existing} />;
}

function EntryForm({ boatId, existing }: { boatId: string; existing?: LogEntry }) {
  const router = useRouter();
  const add = useAddLogEntry();
  const update = useUpdateLogEntry();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title: existing?.title ?? "",
    date: existing?.date ?? todayIso(),
    category: existing?.category ?? "",
    vendorName: existing?.vendorName ?? "",
    cost: existing?.cost != null ? String(existing.cost) : "",
    engineHours: existing?.engineHours != null ? String(existing.engineHours) : "",
    laborHours: existing?.laborHours != null ? String(existing.laborHours) : "",
    notes: existing?.notes ?? "",
  });
  const set = (patch: Partial<typeof f>) => setF((c) => ({ ...c, ...patch }));

  async function save() {
    if (!f.title.trim()) return setError("What was done?");
    if (!isIsoDate(f.date)) return setError("Enter the date as YYYY-MM-DD.");
    setError(null);
    const fields = {
      title: f.title.trim(),
      date: f.date,
      category: (f.category || null) as (typeof LOG_CATEGORIES)[number] | null,
      vendorName: f.vendorName.trim() || null,
      cost: num(f.cost),
      engineHours: num(f.engineHours),
      laborHours: num(f.laborHours),
      notes: f.notes.trim() || null,
    };
    try {
      if (existing) await update.mutateAsync({ id: existing.id, boatId, patch: fields });
      else await add.mutateAsync({ boatId, ...fields });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the entry.");
    }
  }

  return (
    <Screen>
      <Title sub={existing ? undefined : "Work you did yourself, or a shop that isn't on Bosun yet."}>{existing ? "Edit entry" : "Log work"}</Title>
      <Field label="What was done" value={f.title} onChangeText={(v) => set({ title: v })} placeholder="Oil change + filter, impeller" />
      <DateField label="Date" value={f.date} onChange={(v) => set({ date: v })} />
      <Select label="Category" value={f.category} options={LOG_CATEGORIES} placeholder="Optional" onChange={(v) => set({ category: v })} />
      <Field label="Who did it" value={f.vendorName} onChangeText={(v) => set({ vendorName: v })} placeholder="Leave blank if you did it yourself" autoCapitalize="words" />
      <Field label="Cost ($)" value={f.cost} onChangeText={(v) => set({ cost: v })} keyboardType="decimal-pad" placeholder="Optional" />
      <Field label="Engine hours at the time" value={f.engineHours} onChangeText={(v) => set({ engineHours: v })} keyboardType="decimal-pad" placeholder="Optional" hint="Lets the schedule track hours as well as dates." />
      <Field label="Labor hours" value={f.laborHours} onChangeText={(v) => set({ laborHours: v })} keyboardType="decimal-pad" placeholder="Optional" />
      <Field label="Notes" value={f.notes} onChangeText={(v) => set({ notes: v })} multiline placeholder="Parts used, what you noticed, what to check next time" />
      <ErrorText>{error}</ErrorText>
      <Button title={existing ? "Save changes" : "Add to Boat Log"} onPress={save} loading={add.isPending || update.isPending} />
    </Screen>
  );
}
