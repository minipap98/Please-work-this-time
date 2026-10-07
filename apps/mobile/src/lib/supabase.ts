import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@bosun/shared/database.types";
import { chunkedStore } from "./chunkedStore";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseMissing } from "./env";
import { secureStore } from "./secureStore";

// The session lives in the iOS Keychain (expo-secure-store), not AsyncStorage.
const secure = chunkedStore(secureStore);

export const supabase = createClient<Database>(SUPABASE_URL || "https://unconfigured.invalid", SUPABASE_ANON_KEY || "anon", {
  auth: {
    storage: { getItem: secure.get, setItem: secure.set, removeItem: secure.remove },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
if (!supabaseMissing) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export { supabaseMissing };
