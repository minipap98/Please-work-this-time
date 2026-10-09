// Pieces the owners' community screens share: who wrote it, and a thread in a list.
import { Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { excerpt, lastActivity, type CommunityAuthor, type CommunityPost } from "@bosun/shared/community/community";
import { relativeTime } from "@bosun/shared/notifications/route";
import { colors, radius, space } from "@/lib/theme";
import { Card, Muted } from "@/ui";

export function AuthorLine({ author, boat, when, size = 28 }: { author: CommunityAuthor; boat: string | null; when: string; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      {author.avatarUrl ? (
        <Image source={{ uri: author.avatarUrl }} style={{ width: size, height: size, borderRadius: radius.pill }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.navy, fontWeight: "700", fontSize: size * 0.4 }}>{author.initials || author.name.slice(0, 1)}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text }}>
          <Text style={{ fontWeight: "600" }}>{author.name}</Text>
          <Text style={{ color: colors.muted }}> · {relativeTime(when)}</Text>
        </Text>
        {boat ? <Muted numberOfLines={1} style={{ fontSize: 12 }}>Owns a {boat}</Muted> : null}
      </View>
    </View>
  );
}

export function PostCard({ post, onPress, showGroup = false }: { post: CommunityPost; onPress: () => void; showGroup?: boolean }) {
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={2}>
            {post.pinned ? <Ionicons name="pin" size={13} color={colors.sky600} /> : null}
            {post.pinned ? " " : ""}
            {post.title}
          </Text>
          <Muted numberOfLines={2} style={{ marginTop: 2 }}>{excerpt(post.body, 160)}</Muted>
          {showGroup ? <Muted style={{ marginTop: 4, fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>{post.model ? `${post.make} ${post.model}` : `All ${post.make}`}</Muted> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="chatbubble-outline" size={13} color={colors.muted} />
          <Muted style={{ fontSize: 12 }}>{post.replies}</Muted>
        </View>
      </View>
      <View style={{ marginTop: space.sm }}>
        <AuthorLine author={post.author} boat={post.authorBoat} when={lastActivity(post)} size={24} />
      </View>
    </Card>
  );
}
