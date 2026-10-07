import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { Loading } from "@/ui";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (name: Icon) => ({ color, size }: { color: import("react-native").ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function OwnerTabs() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (profile?.role === "vendor") return <Redirect href="/(vendor)/rfps" />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.navy, tabBarInactiveTintColor: colors.faint, headerTintColor: colors.navy, headerTitleStyle: { fontWeight: "600" } }}>
      <Tabs.Screen name="index" options={{ title: "Jobs", tabBarIcon: icon("boat-outline") }} />
      <Tabs.Screen name="post" options={{ title: "Post a job", tabBarIcon: icon("add-circle-outline") }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: icon("chatbubbles-outline") }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarIcon: icon("notifications-outline") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("settings-outline") }} />
    </Tabs>
  );
}
