// Start a thread in one group (modal). The group comes in as params; the boat it's about from My Boats.
import { useState } from "react";
import { Alert, Image, Pressable, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { communityKey, groupLabel, postProblem, POST_BODY_MAX, POST_TITLE_MAX } from "@bosun/shared/community/community";
import { useMyBoats } from "@/lib/boats";
import { useCommunityActions } from "@/lib/community";
import { pickFromLibrary, preparePhoto, takePhoto, type PickedPhoto } from "@/lib/photos";
import { colors, radius, space } from "@/lib/theme";
import { Button, ErrorText, Field, Muted, Row, Screen, Title } from "@/ui";
import { Select } from "@/ui/pickers";

const boatLabel = (b: { name: string; year: string; make: string; model: string }) => `${b.name ? `${b.name} · ` : ""}${b.year} ${b.make} ${b.model}`;

export default function NewThread() {
  const { make = "", model } = useLocalSearchParams<{ make: string; model?: string }>();
  const router = useRouter();
  const actions = useCommunityActions();
  const { boats } = useMyBoats();
  const group = { make, model: model || null };
  const matching = boats.filter((b) => communityKey(b.make) === communityKey(make) && (!model || communityKey(b.model) === communityKey(model)));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [boatId, setBoatId] = useState<string>(matching[0]?.id ?? "");
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choosePhoto() {
    Alert.alert("Add a photo", undefined, [
      { text: "Take photo", onPress: async () => setPhoto((await takePhoto()) ?? photo) },
      { text: "Choose from library", onPress: async () => setPhoto((await pickFromLibrary(1))[0] ?? photo) },
      ...(photo ? [{ text: "Remove photo", style: "destructive" as const, onPress: () => setPhoto(null) }] : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  async function post() {
    const problem = postProblem({ title, body });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      const id = await actions.post.mutateAsync({ make, model: group.model, title, body, boatId: boatId || null, photo: photo ? await preparePhoto(photo) : null });
      router.replace({ pathname: "/owners/post/[id]", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post that.");
    }
  }

  return (
    <Screen>
      <Title sub={`Other owners see your first name, last initial and which boat you own.`}>{groupLabel(group)}</Title>
      <Field label="Title" value={title} onChangeText={(t) => setTitle(t.slice(0, POST_TITLE_MAX))} placeholder="e.g. Livewell pump replacement" autoFocus />
      <Field label="Details" multiline value={body} onChangeText={(t) => setBody(t.slice(0, POST_BODY_MAX))} placeholder="Hours, symptoms, what you tried, what the shop said." />
      {matching.length > 1 && (
        <Select
          label="About which boat?"
          value={boatLabel(matching.find((b) => b.id === boatId) ?? matching[0])}
          options={matching.map(boatLabel)}
          onChange={(label) => setBoatId(matching.find((b) => boatLabel(b) === label)?.id ?? "")}
        />
      )}
      <Pressable onPress={choosePhoto} style={{ marginBottom: space.md }}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }} resizeMode="cover" />
        ) : (
          <Row>
            <Ionicons name="image-outline" size={18} color={colors.sky600} />
            <Text style={{ color: colors.sky600, fontWeight: "600" }}>Add a photo</Text>
          </Row>
        )}
      </Pressable>
      {photo ? <Muted style={{ marginBottom: space.md }}>Tap the photo to change or remove it.</Muted> : null}
      <ErrorText>{error}</ErrorText>
      <Button title="Post thread" onPress={post} loading={actions.post.isPending} disabled={!title.trim() || !body.trim()} />
    </Screen>
  );
}
