import { useEffect, useState } from "react";
import { Alert, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { VENDOR_SPECIALTIES } from "@bosun/shared/vendors/catalog";
import { useMyVendorProfile, useUpdateMyVendorProfile } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Button, Card, Chip, Field, Loading, Muted, Row, Screen, Title } from "@/ui";

export default function ShopProfile() {
  const router = useRouter();
  const { data: shop, isLoading } = useMyVendorProfile();
  const update = useUpdateMyVendorProfile();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");
  const [radius, setRadius] = useState(50);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [insured, setInsured] = useState(false);
  const [licensed, setLicensed] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setName(shop.business_name);
    setPhone(shop.phone ?? "");
    setArea(shop.service_area ?? "");
    setBio(shop.bio ?? "");
    setRadius(shop.service_radius_miles ?? 50);
    setSpecialties(shop.specialties ?? []);
    setInsured(!!shop.insured);
    setLicensed(!!shop.licensed);
  }, [shop]);

  if (isLoading) return <Loading />;
  if (!shop) {
    return (
      <Screen>
        <Title>No shop profile yet</Title>
        <Muted>Finish onboarding to create one.</Muted>
        <Button title="Set up my shop" onPress={() => router.push("/onboarding")} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  async function save() {
    try {
      await update.mutateAsync({ business_name: name.trim(), phone: phone.trim() || null, service_area: area.trim(), bio: bio.trim(), service_radius_miles: radius, specialties, insured, licensed });
      Alert.alert("Saved");
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen>
      <Title sub={shop.verified_at ? "Verified by Bosun" : "What owners see on your bids."}>{shop.business_name}</Title>
      <Field label="Business name" value={name} onChangeText={setName} />
      <Field label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Field label="Service area" value={area} onChangeText={setArea} placeholder="Miami · Fort Lauderdale" hint={shop.lat != null ? "Your shop's map location is set." : "Set your exact location on getbosun.app to filter jobs by distance."} />
      <Text style={styles.label}>How far will you travel?</Text>
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        {[10, 25, 50, 100, 200].map((m) => (
          <Chip key={m} label={`${m} mi`} selected={radius === m} onPress={() => setRadius(m)} />
        ))}
      </Row>
      <Text style={styles.label}>Specialties</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: space.md }}>
        {VENDOR_SPECIALTIES.map((s) => (
          <Chip key={s} label={s} selected={specialties.includes(s)} onPress={() => setSpecialties(specialties.includes(s) ? specialties.filter((x) => x !== s) : [...specialties, s])} />
        ))}
      </View>
      <Field label="About your business" multiline value={bio} onChangeText={setBio} />
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ color: colors.text }}>Insured</Text>
          <Switch value={insured} onValueChange={setInsured} trackColor={{ true: colors.sky }} />
        </Row>
        <Row style={{ justifyContent: "space-between", marginTop: space.sm }}>
          <Text style={{ color: colors.text }}>Licensed</Text>
          <Switch value={licensed} onValueChange={setLicensed} trackColor={{ true: colors.sky }} />
        </Row>
      </Card>
      <Button title="Save" onPress={save} loading={update.isPending} />
      <Card style={{ marginTop: space.xl }}>
        <Text style={{ fontWeight: "600", color: colors.text }}>Crew</Text>
        <Muted style={{ marginTop: 4, marginBottom: space.md }}>Invite techs and managers; they sign in with the email you invite.</Muted>
        <Button title="Manage crew" tone="secondary" onPress={() => router.push("/crew")} />
      </Card>
      <Button title="Settings" tone="ghost" onPress={() => router.push("/settings")} />
    </Screen>
  );
}

const styles = { label: { fontSize: 12, fontWeight: "600" as const, color: colors.text, marginBottom: 6 } };
