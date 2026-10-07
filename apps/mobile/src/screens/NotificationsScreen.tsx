import { FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { notificationRoute, relativeTime, type NotificationData } from "@bosun/shared/notifications/route";
import { useAuth } from "@/lib/auth";
import { appRouteForWebPath } from "@/lib/links";
import { useMarkNotificationsRead, useNotifications } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Button, Card, Empty, Loading, Muted, Screen, Title } from "@/ui";

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const rows = data ?? [];
  const unread = rows.filter((n) => !n.read).length;

  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Title>Notifications</Title>
        {unread > 0 && <Button title="Mark all read" tone="ghost" onPress={() => markRead.mutate(undefined)} />}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(n) => n.id}
        ListEmptyComponent={<Empty title="No notifications yet" />}
        renderItem={({ item: n }) => (
          <Card
            style={!n.read ? { borderColor: colors.sky, backgroundColor: colors.sky50 } : undefined}
            onPress={() => {
              if (!n.read) markRead.mutate(n.id);
              router.push(appRouteForWebPath(notificationRoute(n.data as NotificationData | null, profile?.role)) as never);
            }}
          >
            <Text style={{ fontWeight: n.read ? "500" : "700", color: colors.text }}>{n.title}</Text>
            {n.body ? <Muted style={{ marginTop: 2 }}>{n.body}</Muted> : null}
            <Text style={{ fontSize: 11, color: colors.faint, marginTop: space.xs }}>{relativeTime(n.created_at)}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}
