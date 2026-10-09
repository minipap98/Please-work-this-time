// One group's board: /owners/board?make=pursuit&model=dc-326 (model optional = the whole make).
import { Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { groupLabel, titleFromKey } from "@bosun/shared/community/community";
import { boardParams, useCommunityFeed } from "@/lib/community";
import { colors, space } from "@/lib/theme";
import { Button, Card, Empty, ErrorText, Loading, Muted, Screen } from "@/ui";
import { PostCard } from "@/ui/community";

export default function OwnersBoard() {
  const { make = "", model } = useLocalSearchParams<{ make: string; model?: string }>();
  const router = useRouter();
  const feed = useCommunityFeed(make, model ?? null);
  const group = feed.data?.group ?? { make: titleFromKey(make), model: model ? titleFromKey(model) : null, makeKey: make, modelKey: model ?? null, owners: 0, posts: 0, canPost: false };
  const posts = feed.data?.posts ?? [];
  const label = groupLabel(group);

  return (
    <Screen>
      <Stack.Screen options={{ title: label }} />
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy, letterSpacing: -0.3 }}>{label}</Text>
      <Muted style={{ marginBottom: space.md }}>
        {feed.isLoading ? "Loading…" : `${group.owners} owner${group.owners === 1 ? "" : "s"} on Bosun · ${group.posts} thread${group.posts === 1 ? "" : "s"}${group.model ? "" : " across every model"}`}
      </Muted>
      {group.canPost ? (
        <Button title="Start a thread" onPress={() => router.push({ pathname: "/owners/new", params: { make: group.make, ...(group.model ? { model: group.model } : {}) } })} style={{ marginBottom: space.lg }} />
      ) : feed.data ? (
        <Muted style={{ marginBottom: space.lg }}>Add a {group.model ? `${group.make} ${group.model}` : group.make} to My Boats to post here. Reading is open to every owner.</Muted>
      ) : null}
      {feed.isLoading && <Loading />}
      {feed.isError && <ErrorText>{feed.error instanceof Error ? feed.error.message : "Couldn't load this board."}</ErrorText>}
      {feed.data === null && !feed.isLoading && <Card><Muted>The owners' community is for boat owners.</Muted></Card>}
      {posts.map((p) => <PostCard key={p.id} post={p} showGroup={!group.model} onPress={() => router.push({ pathname: "/owners/post/[id]", params: { id: p.id } })} />)}
      {feed.data && posts.length === 0 && <Empty title="No threads yet" body={group.canPost ? "Start one. Every owner of this boat sees it on their board." : undefined} />}
      {group.model && (
        <Button title={`All ${group.make} owners`} tone="ghost" onPress={() => router.push({ pathname: "/owners/board", params: boardParams({ makeKey: group.makeKey, modelKey: null }) })} style={{ marginTop: space.md }} />
      )}
    </Screen>
  );
}
