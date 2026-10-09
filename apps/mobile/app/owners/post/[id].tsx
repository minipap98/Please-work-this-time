// One thread and its replies, with the reply box pinned under the list.
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { replyProblem, REPLY_BODY_MAX } from "@bosun/shared/community/community";
import { boardParams, useCommunityActions, useCommunityThread } from "@/lib/community";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, ErrorText, Field, Loading, Muted, Screen } from "@/ui";
import { AuthorLine } from "@/ui/community";
import { SectionTitle } from "@/ui/pickers";

function report(onReason: (r: string) => void) {
  Alert.prompt("Report this", "What's wrong with it? (spam, abuse, off topic…)", [
    { text: "Cancel", style: "cancel" },
    { text: "Report", onPress: (r?: string) => onReason(r ?? "") },
  ]);
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const thread = useCommunityThread(id);
  const actions = useCommunityActions();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (thread.isLoading) return <Loading />;
  if (!thread.data) return <Screen><Muted>That thread isn't here any more.</Muted></Screen>;
  const { post, replies, canReply } = thread.data;

  async function send() {
    const problem = replyProblem(body);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      await actions.reply.mutateAsync({ postId: post.id, body });
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post the reply.");
    }
  }

  function deletePost() {
    Alert.alert("Delete this thread?", "Its replies go too.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          actions.deletePost.mutate(post.id, {
            onSuccess: () => router.replace({ pathname: "/owners/board", params: boardParams(post) }),
            onError: (e) => Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e)),
          }),
      },
    ]);
  }

  const flag = (target: { postId: string } | { replyId: string }) =>
    report((reason) => actions.report.mutate({ target, reason }, {
      onSuccess: () => Alert.alert("Thanks", "The Bosun team will take a look."),
      onError: (e) => Alert.alert("Couldn't report", e instanceof Error ? e.message : String(e)),
    }));

  return (
    <Screen>
      <Stack.Screen options={{ title: post.model ? `${post.make} ${post.model}` : post.make }} />
      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.navy, letterSpacing: -0.3 }}>
          {post.pinned ? <Ionicons name="pin" size={16} color={colors.sky600} /> : null}
          {post.pinned ? " " : ""}
          {post.title}
        </Text>
        <View style={{ marginTop: space.sm }}>
          <AuthorLine author={post.author} boat={post.authorBoat} when={post.createdAt} size={34} />
        </View>
        <Text style={{ marginTop: space.md, color: colors.text, lineHeight: 21 }}>{post.body}</Text>
        {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={{ marginTop: space.md, width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.canvas }} resizeMode="cover" /> : null}
        <View style={{ marginTop: space.md, flexDirection: "row", gap: space.lg }}>
          {post.mine ? (
            <Pressable onPress={deletePost} hitSlop={8}><Text style={{ color: colors.red, fontSize: 13 }}>Delete thread</Text></Pressable>
          ) : (
            <Pressable onPress={() => flag({ postId: post.id })} hitSlop={8}><Text style={{ color: colors.muted, fontSize: 13 }}>Report</Text></Pressable>
          )}
        </View>
      </Card>

      <SectionTitle>{replies.length} {replies.length === 1 ? "reply" : "replies"}</SectionTitle>
      {replies.map((r) => (
        <Card key={r.id}>
          <AuthorLine author={r.author} boat={r.authorBoat} when={r.createdAt} />
          <Text style={{ marginTop: space.sm, color: colors.text, lineHeight: 20 }}>{r.body}</Text>
          <View style={{ marginTop: space.sm }}>
            {r.mine ? (
              <Pressable
                hitSlop={8}
                onPress={() => Alert.alert("Delete your reply?", undefined, [
                  { text: "Keep it", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => actions.deleteReply.mutate(r.id, { onError: (e) => Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e)) }) },
                ])}
              >
                <Text style={{ color: colors.red, fontSize: 12 }}>Delete</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => flag({ replyId: r.id })} hitSlop={8}><Text style={{ color: colors.muted, fontSize: 12 }}>Report</Text></Pressable>
            )}
          </View>
        </Card>
      ))}
      {replies.length === 0 && <Muted style={{ marginBottom: space.md }}>No replies yet.</Muted>}

      {canReply && (
        <View style={{ marginTop: space.md }}>
          <Field label="Your reply" multiline value={body} onChangeText={(t) => setBody(t.slice(0, REPLY_BODY_MAX))} placeholder="Hours, part numbers and what it cost help the next owner." />
          <ErrorText>{error}</ErrorText>
          <Button title="Reply" onPress={send} loading={actions.reply.isPending} disabled={!body.trim()} />
        </View>
      )}
    </Screen>
  );
}
