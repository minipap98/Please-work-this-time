// Pickers and small inputs the owner screens share: a searchable list picker, a switch row,
// a date field, stat tiles and section headings.
import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, space } from "@/lib/theme";

export const todayIso = () => new Date().toLocaleDateString("en-CA");

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toLocaleDateString("en-CA") === s;
}

/** "Oct 7, 2026" from YYYY-MM-DD. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const money = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.md, marginBottom: space.sm }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.navy }}>{children}</Text>
      {right}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/**
 * A field that opens a full-screen list to pick from. `other` adds a "not listed" choice that
 * turns the field into free text.
 */
export function Select({
  label,
  value,
  options,
  placeholder = "Choose…",
  onChange,
  other,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
  /** Label for the free-text option, e.g. "Other / not listed". */
  other?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(() => !!value && !options.includes(value));
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.toLowerCase().includes(t)) : options;
  }, [options, q]);

  if (typing) {
    return (
      <View style={{ marginBottom: space.md }}>
        <Label>{label}</Label>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <TextInput style={[styles.input, { flex: 1 }]} value={value} onChangeText={onChange} placeholder="Type it in" placeholderTextColor={colors.faint} autoCapitalize="words" />
          {options.length > 0 && (
            <Pressable onPress={() => { setTyping(false); onChange(""); }} style={styles.sideBtn}>
              <Text style={{ color: colors.sky600, fontWeight: "600" }}>List</Text>
            </Pressable>
          )}
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: space.md }}>
      <Label>{label}</Label>
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={[styles.input, { flexDirection: "row", alignItems: "center" }, disabled && { opacity: 0.5 }]}>
        <Text style={{ flex: 1, fontSize: 15, color: value ? colors.text : colors.faint }} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: space.lg, gap: space.sm }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.navy }}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.navy} />
            </Pressable>
          </View>
          {options.length > 8 && (
            <TextInput style={[styles.input, { marginHorizontal: space.lg, marginBottom: space.sm }]} value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.faint} autoFocus autoCorrect={false} />
          )}
          <FlatList
            data={other ? [...shown, other] : shown}
            keyExtractor={(o, i) => `${o}-${i}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isOther = other && item === other;
              const on = !isOther && item === value;
              return (
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    setQ("");
                    if (isOther) {
                      setTyping(true);
                      onChange("");
                    } else onChange(item);
                  }}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sky50 }]}
                >
                  <Text style={{ flex: 1, fontSize: 15, color: isOther ? colors.sky600 : colors.text, fontWeight: on ? "700" : "400" }}>{item}</Text>
                  {on && <Ionicons name="checkmark" size={18} color={colors.navy} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange, style }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm }, style]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: colors.text }}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.navy }} />
    </View>
  );
}

/** YYYY-MM-DD typed in, with a Today shortcut. */
export function DateField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const bad = !!value && !isIsoDate(value);
  return (
    <View style={{ marginBottom: space.md }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <TextInput style={[styles.input, { flex: 1 }, bad && { borderColor: colors.red }]} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" placeholderTextColor={colors.faint} keyboardType="numbers-and-punctuation" autoCorrect={false} />
        <Pressable onPress={() => onChange(todayIso())} style={styles.sideBtn}>
          <Text style={{ color: colors.sky600, fontWeight: "600" }}>Today</Text>
        </Pressable>
      </View>
      {bad ? <Text style={[styles.hint, { color: colors.red }]}>Use the form 2026-03-14.</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function StatTile({ label, value, tone, onPress, style }: { label: string; value: string | number; tone?: "sky" | "amber" | "green" | "red"; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const fg = tone === "amber" ? colors.amber : tone === "green" ? colors.green : tone === "red" ? colors.red : colors.navy;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }, style]}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: fg }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{label}</Text>
    </Pressable>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} hitSlop={4}>
          <Ionicons name={n <= Math.round(value) ? "star" : "star-outline"} size={size} color={n <= Math.round(value) ? "#f59e0b" : colors.faint} />
        </Pressable>
      ))}
    </View>
  );
}

/** A row that links somewhere: icon, title, subtitle, chevron. */
export function LinkRow({ icon, title, sub, onPress, badge }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; onPress: () => void; badge?: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.sky50 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{title}</Text>
        {sub ? <Text style={styles.hint} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {badge}
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  sideBtn: { paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  tile: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, minWidth: 100 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, marginBottom: space.sm },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" },
});
