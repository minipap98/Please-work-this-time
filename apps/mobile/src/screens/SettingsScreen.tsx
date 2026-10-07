import { useEffect, useState } from "react";
import { Alert, Linking, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Device from "expo-device";
import { useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { disablePush, enablePush } from "@/lib/push";
import { colors, space } from "@/lib/theme";
import { Button, Card, Muted, Screen, Title } from "@/ui";

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [pushState, setPushState] = useState<"idle" | "on" | "off" | "unavailable">("idle");

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

  return (
    <Screen>
      <Title sub={user?.email ?? undefined}>{profile?.name ?? "Settings"}</Title>
      <Card>
        <Text style={{ fontWeight: "600", color: colors.text }}>Push notifications</Text>
        <Muted style={{ marginTop: 4, marginBottom: space.md }}>
          {pushState === "unavailable"
            ? "Pushes need a real device; the simulator can't receive them."
            : pushState === "on"
              ? "On for this device. New bids, messages and jobs near you arrive here."
              : "Get new bids, messages and matching jobs the moment they happen."}
        </Muted>
        {pushState !== "unavailable" && pushState !== "on" && <Button title="Turn on notifications" tone="secondary" onPress={turnOnPush} />}
      </Card>
      <Card>
        <Text style={{ fontWeight: "600", color: colors.text }}>Everything else</Text>
        <Muted style={{ marginTop: 4, marginBottom: space.md }}>Boats, the Boat Log, maintenance schedules, Shop OS and billing live on the website.</Muted>
        <Button title="Open getbosun.app" tone="secondary" onPress={() => Linking.openURL(`${SITE_URL}/${profile?.role === "vendor" ? "vendor-dashboard" : "app"}`)} />
      </Card>
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
