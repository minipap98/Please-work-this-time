// Add or edit a boat: the same make/model/engine catalogs as the web, and a home port verified
// by ZIP (no Google key on the phone; a port picked on the web keeps its Google pin).
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { BOAT_MAKES, BOAT_MODELS } from "@bosun/shared/boats/boatData";
import { ENGINE_DATA, ENGINE_TYPES, OUTBOARD_COUNTS, type EngineType } from "@bosun/shared/boats/engineData";
import { boatYears, type BoatForm as Form } from "@bosun/shared/boats/boats";
import { lookupZip } from "@/lib/location";
import { colors, radius, space } from "@/lib/theme";
import { Button, Chip, ErrorText, Field, Muted } from "@/ui";
import { Label, Select } from "@/ui/pickers";

const YEARS = boatYears();

export function BoatFormScreen({ initial, onSave, saving, error, submitLabel = "Save boat", footer }: { initial: Form; onSave: (f: Form) => void; saving: boolean; error: string | null; submitLabel?: string; footer?: React.ReactNode }) {
  const [f, setF] = useState<Form>(initial);
  const set = (patch: Partial<Form>) => setF((cur) => ({ ...cur, ...patch }));
  const engineMakes = f.engineType ? Object.keys(ENGINE_DATA[f.engineType as EngineType] ?? {}) : [];
  const engineModels = f.engineType && f.engineMake ? ENGINE_DATA[f.engineType as EngineType]?.[f.engineMake] ?? [] : [];

  // Home port
  const [zip, setZip] = useState("");
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  async function verifyZip() {
    setZipBusy(true);
    setZipError(null);
    try {
      const place = await lookupZip(zip);
      if (!place) setZipError("Enter a 5-digit US ZIP code.");
      else set({ homePort: place, homePortLabel: place.label });
    } catch {
      setZipError("Couldn't look that ZIP up. Check your connection and try again.");
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <View>
      <Field label="Boat name" value={f.name} onChangeText={(v) => set({ name: v })} placeholder="No Vacancy" autoCapitalize="words" />
      <Select label="Make" value={f.make} options={BOAT_MAKES} other="Other / not listed" onChange={(v) => set({ make: v, model: "" })} />
      <Select label="Model" value={f.model} options={BOAT_MODELS[f.make] ?? []} other="Other / not listed" onChange={(v) => set({ model: v })} disabled={!f.make} placeholder={f.make ? "Choose…" : "Pick the make first"} />
      <Select label="Year" value={f.year} options={YEARS} onChange={(v) => set({ year: v })} />

      <Label>Engine type</Label>
      <View style={styles.wrap}>
        {ENGINE_TYPES.map((t) => (
          <Chip key={t} label={t} selected={f.engineType === t} onPress={() => set({ engineType: f.engineType === t ? "" : t, engineMake: "", engineModel: "", engineCount: "" })} />
        ))}
      </View>
      {!!f.engineType && (
        <>
          <Select label="Engine make" value={f.engineMake} options={engineMakes} other="Other / not listed" onChange={(v) => set({ engineMake: v, engineModel: "" })} />
          <Select label="Engine model" value={f.engineModel} options={engineModels} other="Other / not listed" onChange={(v) => set({ engineModel: v })} hint="Pick the exact model so the service schedule and insights match it." />
        </>
      )}
      {f.engineType === "Outboard" && (
        <>
          <Label>How many engines?</Label>
          <View style={styles.wrap}>
            {OUTBOARD_COUNTS.map((c) => (
              <Chip key={c} label={c} selected={(f.engineCount || "Single") === c} onPress={() => set({ engineCount: c })} />
            ))}
          </View>
        </>
      )}

      <Label>Home port</Label>
      {f.homePort ? (
        <View style={styles.verified}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600", color: colors.text }}>{f.homePort.label}</Text>
            <Muted>Verified · shops see the town, never the slip</Muted>
          </View>
          <Button title="Change" tone="ghost" onPress={() => set({ homePort: null, homePortLabel: "" })} />
        </View>
      ) : (
        <View style={{ marginBottom: space.md }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <TextInput style={[styles.input, { flex: 1 }]} value={zip} onChangeText={setZip} placeholder="ZIP code of the marina or ramp" placeholderTextColor={colors.faint} keyboardType="number-pad" maxLength={5} />
            <Button title="Verify" tone="secondary" onPress={verifyZip} loading={zipBusy} disabled={zip.trim().length !== 5} />
          </View>
          <ErrorText>{zipError}</ErrorText>
          <Field label="Or describe it" value={f.homePortLabel} onChangeText={(v) => set({ homePortLabel: v })} placeholder="e.g. Rickenbacker Marina, Key Biscayne" hint="A ZIP gives shops a distance; text alone doesn't." />
        </View>
      )}

      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={() => onSave(f)} loading={saving} />
      {footer}
    </View>
  );
}

const styles = {
  wrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: space.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text },
  verified: { flexDirection: "row" as const, alignItems: "center" as const, gap: space.sm, backgroundColor: colors.green50, borderColor: colors.green, borderWidth: 1, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
};
