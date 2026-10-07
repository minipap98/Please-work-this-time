import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken, removePushToken } from "@bosun/shared/db/pushTokens";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

/**
 * Ask for permission (once), fetch this device's Expo push token and save it for the user.
 * Needs a real device and an EAS project id (app.json → extra.eas.projectId). Returns the
 * token, or null when the device can't receive pushes.
 */
export async function enablePush(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  currentToken = token;
  await registerPushToken(supabase, userId, {
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
    appVersion: Constants.expoConfig?.version ?? null,
  });
  return token;
}

/** On sign-out: stop pushes for this device. */
export async function disablePush(): Promise<void> {
  if (!currentToken) return;
  try {
    await removePushToken(supabase, currentToken);
  } finally {
    currentToken = null;
  }
}
