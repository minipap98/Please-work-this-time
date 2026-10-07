import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { appRouteForWebPath } from "@/lib/links";
import { colors } from "@/lib/theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

function NotificationTaps() {
  const router = useRouter();
  useEffect(() => {
    // A tapped push carries the same `url` the web bell opens.
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === "string") router.push(appRouteForWebPath(url) as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <NotificationTaps />
          <Stack
            screenOptions={{
              headerTintColor: colors.navy,
              headerTitleStyle: { fontWeight: "600" },
              headerStyle: { backgroundColor: colors.white },
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: "Sign in", headerShown: false }} />
            <Stack.Screen name="signup" options={{ title: "Create account", headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ title: "Set up", headerShown: false }} />
            <Stack.Screen name="(owner)" options={{ headerShown: false }} />
            <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
            <Stack.Screen name="project/[id]" options={{ title: "Job" }} />
            <Stack.Screen name="bid/[projectId]" options={{ title: "Place a bid", presentation: "modal" }} />
            <Stack.Screen name="thread/[bidId]" options={{ title: "Messages" }} />
            <Stack.Screen name="crew" options={{ title: "Crew" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="inbox" options={{ title: "Inbox" }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
