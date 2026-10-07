import { useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { buildThreads } from "@bosun/shared/marketplace/inbox";
import { useAuth } from "@/lib/auth";
import { useMyVendorProfile, useOwnerProjects, useVendorBidProjects } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Badge, Card, Empty, Loading, Muted, Screen, Title } from "@/ui";

export default function InboxScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const vendor = profile?.role === "vendor";
  const { data: mine } = useMyVendorProfile();
  const owner = useOwnerProjects();
  const shop = useVendorBidProjects(vendor ? mine?.id : null);
  const query = vendor ? shop : owner;
  const threads = useMemo(() => buildThreads(query.data ?? [], { userId: user?.id }), [query.data, user?.id]);

  if (query.isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <Title sub="Messages with the shops and owners you're working with.">Inbox</Title>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.bid.id}
        ListEmptyComponent={<Empty title="No messages yet" body="Conversations start from a bid." />}
        renderItem={({ item: t }) => (
          <Card onPress={() => router.push({ pathname: "/thread/[bidId]", params: { bidId: t.bid.id } })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>
                {vendor ? t.project.owner ?? "Owner" : t.bid.vendorName}
              </Text>
              {t.unreadCount > 0 && <Badge tone="sky">{t.unreadCount} new</Badge>}
            </View>
            <Muted style={{ marginTop: 2 }}>{t.project.title}</Muted>
            <Text style={{ color: colors.muted, marginTop: space.sm }} numberOfLines={1}>
              {t.lastMessage.type === "quote" ? `Quote: ${t.lastMessage.quoteTitle}` : t.lastMessage.text}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
