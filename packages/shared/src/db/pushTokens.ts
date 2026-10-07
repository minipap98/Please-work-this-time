import type { Db } from "./client";

export type PushPlatform = "ios" | "android" | "web";

/** Remember this device's push token for the signed-in user. Safe to call on every launch. */
export async function registerPushToken(
  client: Db,
  userId: string,
  input: { token: string; platform: PushPlatform; appVersion?: string | null },
): Promise<void> {
  const { error } = await client
    .from("device_push_tokens")
    .upsert(
      { user_id: userId, token: input.token, platform: input.platform, app_version: input.appVersion ?? null, last_seen_at: new Date().toISOString() },
      { onConflict: "token" },
    );
  if (error) throw error;
}

/** Forget a device (sign-out, or the user turned notifications off). */
export async function removePushToken(client: Db, token: string): Promise<void> {
  const { error } = await client.from("device_push_tokens").delete().eq("token", token);
  if (error) throw error;
}
