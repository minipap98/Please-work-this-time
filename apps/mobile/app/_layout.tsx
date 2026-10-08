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
            {/* The tab groups draw their own headers; the title here is only what the back button on the next screen says. */}
            <Stack.Screen name="(owner)" options={{ title: "Home", headerShown: false }} />
            <Stack.Screen name="(vendor)" options={{ title: "Shop", headerShown: false }} />
            <Stack.Screen name="project/[id]" options={{ title: "Job" }} />
            <Stack.Screen name="bid/[projectId]" options={{ title: "Place a bid", presentation: "modal" }} />
            <Stack.Screen name="thread/[bidId]" options={{ title: "Messages" }} />
            <Stack.Screen name="crew" options={{ title: "Crew" }} />
            <Stack.Screen name="tech" options={{ title: "My jobs" }} />
            <Stack.Screen name="shop/orders" options={{ title: "Work orders" }} />
            <Stack.Screen name="shop/order/[id]" options={{ title: "Work order" }} />
            <Stack.Screen name="shop/schedule" options={{ title: "Schedule" }} />
            <Stack.Screen name="shop/customers" options={{ title: "Customers" }} />
            <Stack.Screen name="shop/customer/[id]" options={{ title: "Customer" }} />
            <Stack.Screen name="shop/inventory" options={{ title: "Inventory" }} />
            <Stack.Screen name="shop/item/[id]" options={{ title: "Part" }} />
            <Stack.Screen name="shop/parts" options={{ title: "Parts inbound" }} />
            <Stack.Screen name="shop/shipment/[id]" options={{ title: "Shipment" }} />
            <Stack.Screen name="shop/settings" options={{ title: "Shop settings" }} />
            <Stack.Screen name="shop/insights" options={{ title: "Insights" }} />
            <Stack.Screen name="shop/revenue" options={{ title: "Revenue" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="inbox" options={{ title: "Inbox" }} />
            <Stack.Screen name="post" options={{ title: "Post a job" }} />
            <Stack.Screen name="boat/new" options={{ title: "Add a boat" }} />
            <Stack.Screen name="boat/edit" options={{ title: "Edit boat" }} />
            <Stack.Screen name="boat/[id]" options={{ title: "Boat" }} />
            <Stack.Screen name="boat-log" options={{ title: "Boat Log" }} />
            <Stack.Screen name="log/new" options={{ title: "Log work", presentation: "modal" }} />
            <Stack.Screen name="log/[id]" options={{ title: "Service" }} />
            <Stack.Screen name="log/import" options={{ title: "Import invoice", presentation: "modal" }} />
            <Stack.Screen name="receipts" options={{ title: "Emailed receipts" }} />
            <Stack.Screen name="maintenance" options={{ title: "Maintenance" }} />
            <Stack.Screen name="maintenance/plan" options={{ title: "Service schedule", presentation: "modal" }} />
            <Stack.Screen name="vendor/[id]" options={{ title: "Shop" }} />
            <Stack.Screen name="history/[token]" options={{ title: "Service history" }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
