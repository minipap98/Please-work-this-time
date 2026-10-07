import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { postLoginPath } from "@bosun/shared/api";
import { useAuth } from "@/lib/auth";
import { appRouteForWebPath } from "@/lib/links";
import { supabaseMissing } from "@/lib/supabase";
import { Loading } from "@/ui";

/** The gate: signed out → login; new → onboarding; otherwise the home for the account's role. */
export default function Index() {
  const { user, profile, loading } = useAuth();
  if (supabaseMissing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontWeight: "600" }}>Bosun isn't configured</Text>
        <Text style={{ color: "#64748b", marginTop: 6, textAlign: "center" }}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env.</Text>
      </View>
    );
  }
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (!profile) return <Loading />;
  if (!profile.onboarding_complete) return <Redirect href="/onboarding" />;
  return <Redirect href={appRouteForWebPath(postLoginPath(profile.role, true)) as never} />;
}
