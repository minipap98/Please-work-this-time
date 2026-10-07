// Small, dependency-free building blocks in the web app's visual language.
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, space } from "@/lib/theme";

export function Screen({ children, scroll = true, padded = true, style }: { children: ReactNode; scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle> }) {
  const inner = <View style={[padded && styles.padded, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

type Tone = "primary" | "secondary" | "danger" | "ghost";
export function Button({ title, tone = "primary", loading, style, disabled, ...rest }: PressableProps & { title: string; tone?: Tone; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      style={({ pressed }) => [styles.btn, styles[`btn_${tone}`], off && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={tone === "primary" || tone === "danger" ? colors.white : colors.navy} /> : <Text style={[styles.btnText, styles[`btnText_${tone}`]]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...rest }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.faint} style={[styles.input, rest.multiline && { minHeight: 96, textAlignVertical: "top" }]} {...rest} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Badge({ children, tone = "sky" }: { children: ReactNode; tone?: "sky" | "green" | "amber" | "red" | "muted" }) {
  const map = {
    sky: { bg: colors.sky50, fg: colors.sky600 },
    green: { bg: colors.green50, fg: colors.green },
    amber: { bg: colors.amber50, fg: colors.amber },
    red: { bg: colors.red50, fg: colors.red },
    muted: { bg: "#f1f5f9", fg: colors.muted },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: map.fg, fontSize: 11, fontWeight: "600" }}>{children}</Text>
    </View>
  );
}

export function Muted({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48 }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{title}</Text>
      {body ? <Text style={[styles.muted, { textAlign: "center", marginTop: 6 }]}>{body}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 48 }}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <Text style={{ color: colors.red, fontSize: 13, marginBottom: space.md }}>{children}</Text>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space.sm }, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1 },
  padded: { padding: space.lg, flex: 1 },
  title: { fontSize: 24, fontWeight: "700", color: colors.navy, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.md },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  btn_primary: { backgroundColor: colors.navy },
  btn_secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  btn_danger: { backgroundColor: colors.red },
  btn_ghost: { backgroundColor: "transparent" },
  btnText: { fontSize: 15, fontWeight: "600" },
  btnText_primary: { color: colors.white },
  btnText_secondary: { color: colors.navy },
  btnText_danger: { color: colors.white },
  btnText_ghost: { color: colors.sky600 },
  label: { fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  muted: { fontSize: 13, color: colors.muted },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "500" },
});
