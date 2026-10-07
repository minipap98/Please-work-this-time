import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { Loading } from "@/ui";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (name: Icon) => ({ color, size }: { color: import("react-native").ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function VendorTabs() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (profile?.role === "owner") return <Redirect href="/(owner)" />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.navy, tabBarInactiveTintColor: colors.faint, headerTintColor: colors.navy, headerTitleStyle: { fontWeight: "600" } }}>
      <Tabs.Screen name="rfps" options={{ title: "Jobs near you", tabBarIcon: icon("compass-outline") }} />
      <Tabs.Screen name="my-bids" options={{ title: "My bids", tabBarIcon: icon("clipboard-outline") }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: icon("chatbubbles-outline") }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarIcon: icon("notifications-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Shop", tabBarIcon: icon("storefront-outline") }} />
    </Tabs>
  );
}
