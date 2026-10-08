import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useBidMessages, useMarkMessagesRead, useSendMessage } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { colors, radius, space } from "@/lib/theme";
import { Button, Loading, Muted, Screen } from "@/ui";

/** Who's on the other end of a bid thread, from the bid itself (profiles are private; names come from the job). */
function useThreadParties(bidId: string | undefined) {
  return useQuery({
    queryKey: ["thread-parties", bidId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("id, vendor:vendor_profiles(user_id, business_name), project:projects!bids_project_id_fkey(id, title, owner_id)")
        .eq("id", bidId!)
        .single();
      if (error) throw error;
      const row = data as unknown as { vendor: { user_id: string; business_name: string } | null; project: { id: string; title: string; owner_id: string } | null };
      return { vendorUserId: row.vendor?.user_id ?? null, vendorName: row.vendor?.business_name ?? "Shop", ownerId: row.project?.owner_id ?? null, title: row.project?.title ?? "" };
    },
    enabled: !!bidId,
  });
}

export default function Thread() {
  const { bidId } = useLocalSearchParams<{ bidId: string }>();
  const { user } = useAuth();
  const { data: parties } = useThreadParties(bidId);
  const { data: messages = [], isLoading } = useBidMessages(bidId);
  const send = useSendMessage();
  const markRead = useMarkMessagesRead();
  const [text, setText] = useState("");
  const list = useRef<FlatList>(null);

  const me = user?.id;
  const other = parties ? (me === parties.ownerId ? parties.vendorUserId : parties.ownerId) : null;

  useEffect(() => {
    if (bidId && messages.some((m) => m.recipient_id === me && m.status !== "read")) markRead.mutate(bidId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidId, messages.length]);

  async function submit() {
    if (!text.trim() || !bidId || !other) return;
    const body = text.trim();
    setText("");
    try {
      await send.mutateAsync({ bid_id: bidId, recipient_id: other, text: body });
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setText(body);
      Alert.alert("Message not sent", e instanceof Error ? e.message : String(e));
    }
  }

  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        {parties && (
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
            <Text style={{ fontWeight: "600", color: colors.text }}>{me === parties.ownerId ? parties.vendorName : "Owner"}</Text>
            <Muted>{parties.title}</Muted>
          </View>
        )}
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Muted style={{ textAlign: "center", marginTop: space.xl }}>Say hello.</Muted>}
          renderItem={({ item: m }) => {
            const own = m.sender_id === me;
            return (
              <View style={{ alignSelf: own ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: own ? colors.navy : colors.white, borderWidth: own ? 0 : 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 9 }}>
                {m.is_quote && <Text style={{ color: own ? colors.white : colors.navy, fontWeight: "700" }}>Quote: {m.quote_title} · ${m.quote_price?.toLocaleString()}</Text>}
                <Text style={{ color: own ? colors.white : colors.text }}>{m.text}</Text>
                <Text style={{ fontSize: 10, color: own ? "rgba(255,255,255,0.7)" : colors.faint, marginTop: 3 }}>
                  {new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </Text>
              </View>
            );
          }}
        />
        <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}>
          <TextInput value={text} onChangeText={setText} placeholder="Type a message…" placeholderTextColor={colors.faint} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, color: colors.text }} onSubmitEditing={submit} />
          <Button title="Send" onPress={submit} disabled={!text.trim() || !other} loading={send.isPending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
