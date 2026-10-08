import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { postLoginPath } from "@bosun/shared/api";
import { useAuth } from "@/lib/auth";
import { appRouteForWebPath } from "@/lib/links";
import { useMyCrewMemberships } from "@/lib/shop";
import { supabaseMissing } from "@/lib/supabase";
import { Loading } from "@/ui";

/**
 * The gate: signed out → login; on a shop's crew → my jobs; new → onboarding; otherwise the home
 * for the account's role. Crew logins skip onboarding, the same as /tech on the web.
 */
export default function Index() {
  const { user, profile, loading } = useAuth();
  const crew = useMyCrewMemberships();
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
  if (profile.role !== "vendor") {
    if (crew.isLoading) return <Loading />;
    if ((crew.data ?? []).length > 0) return <Redirect href="/tech" />;
  }
  if (!profile.onboarding_complete) return <Redirect href="/onboarding" />;
  return <Redirect href={appRouteForWebPath(postLoginPath(profile.role, true)) as never} />;
}
