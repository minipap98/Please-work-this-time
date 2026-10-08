import { Redirect, useRouter } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/queries";
import { colors, radius, space } from "@/lib/theme";
import { Loading } from "@/ui";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (name: Icon) => ({ color, size }: { color: import("react-native").ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

/** Bell (with the unread count) and settings, on every owner tab. */
function HeaderButtons() {
  const router = useRouter();
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.read).length;
  return (
    <View style={{ flexDirection: "row", gap: space.sm, paddingRight: space.sm }}>
      <Pressable onPress={() => router.push("/notifications")} hitSlop={8} style={{ padding: 6 }}>
        <Ionicons name="notifications-outline" size={22} color={colors.navy} />
        {unread > 0 && (
          <View style={{ position: "absolute", top: 0, right: 0, minWidth: 16, height: 16, borderRadius: radius.pill, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
            <Text style={{ color: colors.white, fontSize: 10, fontWeight: "700" }}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        )}
      </Pressable>
      <Pressable onPress={() => router.push("/settings")} hitSlop={8} style={{ padding: 6 }}>
        <Ionicons name="settings-outline" size={22} color={colors.navy} />
      </Pressable>
    </View>
  );
}

export default function OwnerTabs() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (profile?.role === "vendor") return <Redirect href="/(vendor)" />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.navy, tabBarInactiveTintColor: colors.faint, headerTintColor: colors.navy, headerTitleStyle: { fontWeight: "600" }, headerRight: () => <HeaderButtons /> }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: icon("construct-outline") }} />
      <Tabs.Screen name="boats" options={{ title: "My Boats", tabBarIcon: icon("boat-outline") }} />
      <Tabs.Screen name="shops" options={{ title: "Find a Shop", tabBarIcon: icon("storefront-outline") }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: icon("chatbubbles-outline") }} />
    </Tabs>
  );
}
