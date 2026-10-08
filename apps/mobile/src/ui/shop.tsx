// Shop OS building blocks: status badges, dates and times, a date+time field, money.
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ShipmentStatus, WorkOrderStatus } from "@bosun/shared/shop";
import { money as sharedMoney } from "@bosun/shared/shop/drafts";
import { colors, radius, space } from "@/lib/theme";
import { Badge } from "@/ui";
import { Label, isIsoDate, todayIso } from "@/ui/pickers";

export const money = sharedMoney;

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function hhmm(iso: string | null): string {
  if (!iso) return "Any time";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function timeRange(start: string | null, end: string | null): string {
  if (!start) return "Unscheduled";
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const day = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (!end) return `${day} · ${s.toLocaleTimeString("en-US", opts)}`;
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay
    ? `${day} · ${s.toLocaleTimeString("en-US", opts)}–${e.toLocaleTimeString("en-US", opts)}`
    : `${day} → ${e.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

const WO_TONE: Record<WorkOrderStatus, "sky" | "green" | "amber" | "red" | "muted"> = {
  scheduled: "muted",
  "in-progress": "sky",
  "waiting-parts": "amber",
  completed: "green",
  invoiced: "green",
};
export const WO_LABEL: Record<WorkOrderStatus, string> = {
  scheduled: "Scheduled",
  "in-progress": "In progress",
  "waiting-parts": "Waiting on parts",
  completed: "Completed",
  invoiced: "Invoiced",
};

export function WorkOrderBadge({ status }: { status: WorkOrderStatus }) {
  return <Badge tone={WO_TONE[status]}>{WO_LABEL[status]}</Badge>;
}

const SH_TONE: Record<ShipmentStatus, "sky" | "green" | "amber" | "red" | "muted"> = {
  ordered: "muted",
  shipped: "sky",
  "out-for-delivery": "sky",
  delivered: "green",
  exception: "red",
};
export const SH_LABEL: Record<ShipmentStatus, string> = {
  ordered: "Ordered",
  shipped: "In transit",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
};

export function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  return <Badge tone={SH_TONE[status]}>{SH_LABEL[status]}</Badge>;
}

/** Local date (YYYY-MM-DD) and time (HH:MM) halves of an ISO instant. */
export function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Back to an ISO instant; null when the date is missing or malformed. */
export function joinLocal(date: string, time: string): string | null {
  if (!isIsoDate(date)) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const [y, mo, d] = date.split("-").map(Number);
  const out = new Date(y, mo - 1, d, m ? Number(m[1]) : 0, m ? Number(m[2]) : 0);
  return Number.isNaN(out.getTime()) ? null : out.toISOString();
}

/** A scheduled moment: a date and a 24-hour time typed in, with Today and Clear shortcuts. */
export function DateTimeField({ label, value, onChange, hint }: { label: string; value: string | null; onChange: (iso: string | null) => void; hint?: string }) {
  const init = splitLocal(value);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const bad = !!date && !isIsoDate(date);
  const commit = (d: string, t: string) => {
    setDate(d);
    setTime(t);
    onChange(d ? joinLocal(d, t) : null);
  };
  return (
    <View style={{ marginBottom: space.md }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <TextInput style={[styles.input, { flex: 3 }, bad && { borderColor: colors.red }]} value={date} onChangeText={(v) => commit(v, time)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.faint} keyboardType="numbers-and-punctuation" autoCorrect={false} />
        <TextInput style={[styles.input, { flex: 2 }]} value={time} onChangeText={(v) => commit(date, v)} placeholder="08:00" placeholderTextColor={colors.faint} keyboardType="numbers-and-punctuation" autoCorrect={false} />
        <Pressable onPress={() => commit(todayIso(), time || "08:00")} style={styles.sideBtn}>
          <Text style={{ color: colors.sky600, fontWeight: "600" }}>Today</Text>
        </Pressable>
        {!!date && (
          <Pressable onPress={() => commit("", "")} style={styles.sideBtn}>
            <Text style={{ color: colors.muted, fontWeight: "600" }}>Clear</Text>
          </Pressable>
        )}
      </View>
      {bad ? <Text style={[styles.hint, { color: colors.red }]}>Use the form 2026-03-14 and 08:00.</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A number typed in; blank reads as null. */
export function NumberField({ label, value, onChange, hint, placeholder, allowBlank }: { label: string; value: number | null; onChange: (n: number | null) => void; hint?: string; placeholder?: string; allowBlank?: boolean }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  return (
    <View style={{ marginBottom: space.md }}>
      <Label>{label}</Label>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(v) => {
          setText(v);
          const n = Number(v);
          if (v.trim() === "") onChange(allowBlank ? null : 0);
          else if (Number.isFinite(n)) onChange(n);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType="decimal-pad"
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Key on the left, value on the right. */
export function KV({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, gap: space.md }}>
      <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={1}>{k}</Text>
      <Text style={{ color: colors.text, fontWeight: strong ? "700" : "400" }}>{v}</Text>
    </View>
  );
}

/** A thin section heading inside a list. */
export function ListHeading({ children }: { children: string }) {
  return <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted, marginTop: space.md, marginBottom: space.sm }}>{children}</Text>;
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  sideBtn: { paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white },
});
