import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LOCATION_KEYS, isMissingColumn, withoutKeys } from "@bosun/shared/db/optionalColumns";
import { hasBoatDetails, ownerBoatRow, ownerProfilePatch, vendorProfilePatch, vendorProfileRow, type OwnerBoatForm, type VendorOnboardingForm } from "@bosun/shared/onboarding";
import { VENDOR_SPECIALTIES } from "@bosun/shared/vendors/catalog";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/theme";
import { Button, Chip, ErrorText, Field, Muted, Screen, Title } from "@/ui";

/**
 * The short version of the web's onboarding: enough to make the account usable. Verified
 * locations (Google Places) and service schedules stay on the web for now.
 */
export default function Onboarding() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const isVendor = profile?.role === "vendor";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Owner
  const [homePort, setHomePort] = useState("");
  const [boat, setBoat] = useState<OwnerBoatForm>({ make: "", model: "", year: "", name: "", engineType: "", engineMake: "", engineModel: "", engineCount: "" });

  // Shop
  const [form, setForm] = useState<VendorOnboardingForm>({
    businessName: profile?.name ?? "",
    phone: "",
    yearsInBusiness: "",
    insured: false,
    licensed: false,
    specialties: [],
    certifications: [],
    serviceArea: "",
    bio: "",
    serviceRadiusMiles: 50,
  });

  async function finish() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (isVendor) {
        if (!form.businessName.trim()) throw new Error("Tell owners your business name.");
        const row = vendorProfileRow(user.id, form, null);
        let { error: e } = await supabase.from("vendor_profiles").insert(row);
        if (isMissingColumn(e)) ({ error: e } = await supabase.from("vendor_profiles").insert(withoutKeys(row, LOCATION_KEYS)));
        if (e) throw new Error(e.message);
        await updateProfile(vendorProfilePatch(form, null));
      } else {
        if (hasBoatDetails(boat)) {
          const row = ownerBoatRow(user.id, boat, homePort, null);
          let { error: e } = await supabase.from("boats").insert(row);
          if (isMissingColumn(e)) ({ error: e } = await supabase.from("boats").insert(withoutKeys(row, LOCATION_KEYS)));
          if (e) throw new Error(e.message);
        }
        await updateProfile(ownerProfilePatch(homePort, null));
      }
      await refreshProfile();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
    } finally {
      setBusy(false);
    }
  }

  if (isVendor) {
    return (
      <Screen>
        <Title sub="Boat owners nearby will see this when you bid.">Set up your shop</Title>
        <Field label="Business name" value={form.businessName} onChangeText={(v) => setForm({ ...form, businessName: v })} />
        <Field label="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
        <Field label="Years in business" keyboardType="number-pad" value={form.yearsInBusiness} onChangeText={(v) => setForm({ ...form, yearsInBusiness: v })} />
        <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 6 }}>What you do</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: space.md }}>
          {VENDOR_SPECIALTIES.map((s) => (
            <Chip key={s} label={s} selected={form.specialties.includes(s)} onPress={() => setForm({ ...form, specialties: form.specialties.includes(s) ? form.specialties.filter((x) => x !== s) : [...form.specialties, s] })} />
          ))}
        </View>
        <Field label="Service area" placeholder="e.g. Miami · Fort Lauderdale" value={form.serviceArea} onChangeText={(v) => setForm({ ...form, serviceArea: v })} hint="Add your exact shop location later from the web's Shop Settings to filter jobs by distance." />
        <Field label="About your business" multiline value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} />
        <ErrorText>{error}</ErrorText>
        <Button title="Finish" onPress={finish} loading={busy} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title sub="Shops see where the work is; never your exact slip.">Where's the boat?</Title>
      <Field label="Home port or town" placeholder="e.g. Fort Lauderdale, FL" value={homePort} onChangeText={setHomePort} />
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.navy, marginTop: space.md, marginBottom: space.sm }}>Your boat (optional)</Text>
      <Field label="Name" value={boat.name} onChangeText={(v) => setBoat({ ...boat, name: v })} placeholder="No Vacancy" />
      <Field label="Make" value={boat.make} onChangeText={(v) => setBoat({ ...boat, make: v })} placeholder="Sea Ray" />
      <Field label="Model" value={boat.model} onChangeText={(v) => setBoat({ ...boat, model: v })} placeholder="SDX 250" />
      <Field label="Year" keyboardType="number-pad" value={boat.year} onChangeText={(v) => setBoat({ ...boat, year: v })} placeholder="2020" />
      <Field label="Engine make" value={boat.engineMake} onChangeText={(v) => setBoat({ ...boat, engineMake: v })} placeholder="Yamaha" />
      <Field label="Engine model" value={boat.engineModel} onChangeText={(v) => setBoat({ ...boat, engineModel: v })} placeholder="F200" />
      <Muted style={{ marginBottom: space.md }}>You can add more boats, photos and a service schedule on getbosun.app.</Muted>
      <ErrorText>{error}</ErrorText>
      <Button title="Finish" onPress={finish} loading={busy} />
    </Screen>
  );
}
