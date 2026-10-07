// Settings: your details and where the boat is, the active boat's photo, pushes, receipts, sign out.
import { useEffect, useState } from "react";
import { Alert, Linking, Share, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Device from "expo-device";
import { boatHomePortPatch, profileLocationPatch } from "@bosun/shared/profile";
import { receiptsAddress } from "@bosun/shared/boatLog/receipts";
import { boatTitle } from "@bosun/shared/boats/boats";
import { useAuth } from "@/lib/auth";
import { useMyBoats, useSetBoatPhoto, useUpdateBoat } from "@/lib/boats";
import { INBOUND_EMAIL_DOMAIN, SITE_URL } from "@/lib/env";
import { lookupZip } from "@/lib/location";
import { pickFromLibrary, preparePhoto, takePhoto } from "@/lib/photos";
import { disablePush, enablePush } from "@/lib/push";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, ErrorText, Field, Muted, Row, Screen, Title } from "@/ui";

export default function SettingsScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const isOwner = profile?.role !== "vendor";
  const { active } = useMyBoats();
  const updateBoat = useUpdateBoat();
  const setPhoto = useSetBoatPhoto();
  const [pushState, setPushState] = useState<"idle" | "on" | "off" | "unavailable">("idle");
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zip, setZip] = useState("");
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    if (!Device.isDevice) setPushState("unavailable");
  }, []);

  async function turnOnPush() {
    if (!user) return;
    try {
      const token = await enablePush(user.id);
      setPushState(token ? "on" : "off");
      if (!token) Alert.alert("Notifications are off", "Allow notifications for Bosun in iOS Settings to get bids and messages as they arrive.");
    } catch (e) {
      Alert.alert("Could not enable notifications", e instanceof Error ? e.message : String(e));
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ name: name.trim() || profile?.name, phone: phone.trim() || null });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation() {
    setZipBusy(true);
    setError(null);
    try {
      const place = await lookupZip(zip);
      if (!place) throw new Error("Enter a 5-digit US ZIP code.");
      await updateProfile(profileLocationPatch(place));
      if (active) await updateBoat.mutateAsync({ id: active.id, patch: boatHomePortPatch(place) });
      setZip("");
      Alert.alert("Location saved", `${place.label}. Shops see the town, never the slip.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the location.");
    } finally {
      setZipBusy(false);
    }
  }

  async function changePhoto(camera: boolean) {
    if (!active) return;
    const shot = camera ? await takePhoto() : (await pickFromLibrary(1))[0];
    if (!shot) return;
    try {
      await setPhoto.mutateAsync({ boat: active, photo: await preparePhoto(shot) });
    } catch (e) {
      Alert.alert("Couldn't save the photo", e instanceof Error ? e.message : String(e));
    }
  }

  const receipts = receiptsAddress(INBOUND_EMAIL_DOMAIN);

  return (
    <Screen>
      <Title sub={user?.email ?? undefined}>{profile?.name ?? "Settings"}</Title>

      <Card>
        <Text style={styles.h}>Your details</Text>
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint="Only the shop you accept sees it." />
        <ErrorText>{error}</ErrorText>
        <Button title={saved ? "Saved" : "Save"} tone="secondary" onPress={saveProfile} loading={saving} />
      </Card>

      {isOwner && (
        <Card>
          <Text style={styles.h}>Where's the boat?</Text>
          <Muted style={{ marginBottom: space.sm }}>{profile?.location ? `${profile.location}${profile.location_lat != null ? " · verified" : " · not verified yet"}` : "Not set. Shops match jobs by distance."}</Muted>
          <Row>
            <TextInput style={[styles.input, { flex: 1 }]} value={zip} onChangeText={setZip} placeholder="ZIP code of the marina" placeholderTextColor={colors.faint} keyboardType="number-pad" maxLength={5} />
            <Button title="Save" tone="secondary" onPress={saveLocation} loading={zipBusy} disabled={zip.trim().length !== 5} />
          </Row>
          <Muted style={{ marginTop: 6 }}>Updates your location{active ? ` and ${boatTitle(active)}'s home port` : ""}. For an exact marina pin, use getbosun.app.</Muted>
        </Card>
      )}

      {isOwner && active && (
        <Card>
          <Text style={styles.h}>Photo of {boatTitle(active)}</Text>
          <Muted style={{ marginBottom: space.sm }}>{active.photo_url ? "Shown on your home screen. Frame it on getbosun.app → Settings." : "Shown on your home screen."}</Muted>
          <Row>
            <Button title="Take photo" tone="secondary" onPress={() => changePhoto(true)} loading={setPhoto.isPending} style={{ flex: 1 }} />
            <Button title="Choose" tone="secondary" onPress={() => changePhoto(false)} loading={setPhoto.isPending} style={{ flex: 1 }} />
            {!!active.photo_url && <Button title="Remove" tone="ghost" onPress={() => setPhoto.mutate({ boat: active, photo: null })} />}
          </Row>
        </Card>
      )}

      <Card>
        <Text style={styles.h}>Push notifications</Text>
        <Muted style={{ marginTop: 4, marginBottom: space.md }}>
          {pushState === "unavailable"
            ? "Pushes need a real device; the simulator can't receive them."
            : pushState === "on"
              ? "On for this device. New bids, messages and jobs near you arrive here."
              : "Get new bids, messages and matching jobs the moment they happen."}
        </Muted>
        {pushState !== "unavailable" && pushState !== "on" && <Button title="Turn on notifications" tone="secondary" onPress={turnOnPush} />}
      </Card>

      {isOwner && receipts && (
        <Card>
          <Text style={styles.h}>Email receipts to your Boat Log</Text>
          <Muted style={{ marginTop: 4 }}>Forward a shop's receipt from {user?.email ?? "your account email"} to</Muted>
          <Text selectable style={{ color: colors.sky600, fontWeight: "600", marginVertical: 6 }}>{receipts}</Text>
          <Muted style={{ marginBottom: space.md }}>Bosun reads it and asks you to check it before it's logged.</Muted>
          <Row>
            <Button title="Share address" tone="secondary" onPress={() => Share.share({ message: receipts })} style={{ flex: 1 }} />
            <Button title="Review receipts" tone="secondary" onPress={() => router.push("/receipts")} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      <Card>
        <Text style={styles.h}>On the web</Text>
        <Muted style={{ marginTop: 4, marginBottom: space.md }}>{isOwner ? "Exact marina pins (Google Maps), photo framing, PDF exports and subscriptions live on getbosun.app." : "Shop OS, billing, QuickBooks export and crew live on getbosun.app."}</Muted>
        <Button title="Open getbosun.app" tone="secondary" onPress={() => Linking.openURL(`${SITE_URL}/${isOwner ? "app" : "vendor-dashboard"}`)} />
      </Card>
      <View style={{ height: space.sm }} />
      <Button
        title="Sign out"
        tone="danger"
        onPress={async () => {
          await disablePush();
          await signOut();
          router.replace("/login");
        }}
      />
    </Screen>
  );
}

const styles = {
  h: { fontWeight: "700" as const, color: colors.navy, marginBottom: space.sm, fontSize: 15 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text },
};
