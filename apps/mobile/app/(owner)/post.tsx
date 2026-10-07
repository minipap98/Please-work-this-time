import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { approximate } from "@bosun/shared/geo";
import { JOB_CATEGORIES, WORK_LOCATIONS } from "@bosun/shared/marketplace/catalog";
import { useAuth } from "@/lib/auth";
import { pickFromLibrary, preparePhoto, takePhoto, type PickedPhoto } from "@/lib/photos";
import { useCreateProject } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { colors, radius, space } from "@/lib/theme";
import { Button, Chip, ErrorText, Field, Muted, Row, Screen, Title } from "@/ui";

function useMyBoats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boats").select("*").eq("owner_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export default function PostJob() {
  const { profile } = useAuth();
  const router = useRouter();
  const { data: boats = [] } = useMyBoats();
  const create = useCreateProject();
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [boatId, setBoatId] = useState<string>("");
  const [workLocation, setWorkLocation] = useState<string>("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!boatId && boats[0]) setBoatId(boats[0].id);
  }, [boats, boatId]);

  const boat = boats.find((b) => b.id === boatId);

  // Rounded job location so shops can match by distance without seeing the exact slip.
  function coords() {
    const src =
      boat && boat.home_port_lat != null && boat.home_port_lng != null
        ? { lat: boat.home_port_lat, lng: boat.home_port_lng }
        : profile && profile.location_lat != null && profile.location_lng != null
          ? { lat: profile.location_lat, lng: profile.location_lng }
          : null;
    return src ? { lat: approximate(src.lat), lng: approximate(src.lng) } : {};
  }

  async function submit() {
    if (!title.trim()) {
      setError("Give the job a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prepared = [];
      for (const p of photos) prepared.push(await preparePhoto(p));
      const project = await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: category || undefined,
        location: boat?.home_port ?? profile?.location ?? undefined,
        ...coords(),
        boatId: boatId || undefined,
        photos: prepared,
        metadata: { workLocation: workLocation || undefined },
      });
      setTitle("");
      setDescription("");
      setPhotos([]);
      setCategory("");
      router.push({ pathname: "/project/[id]", params: { id: project.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post the job.");
    } finally {
      setBusy(false);
    }
  }

  async function addFromLibrary() {
    const picked = await pickFromLibrary(6 - photos.length);
    setPhotos((prev) => [...prev, ...picked].slice(0, 6));
  }

  async function addFromCamera() {
    const shot = await takePhoto();
    if (shot) setPhotos((prev) => [...prev, shot].slice(0, 6));
  }

  return (
    <Screen>
      <Title sub="Describe the work; local shops send line-item bids.">Post a job</Title>

      <Text style={styles.label}>What kind of work?</Text>
      <View style={styles.wrap}>
        {JOB_CATEGORIES.map((c) => (
          <Chip key={c.label} label={c.label} selected={category === c.label} onPress={() => setCategory(c.label)} />
        ))}
      </View>

      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Annual engine service" />
      <Field label="Details" multiline value={description} onChangeText={setDescription} placeholder="What's going on, what you've noticed, anything the shop should know." />

      {boats.length > 0 && (
        <>
          <Text style={styles.label}>Which boat?</Text>
          <View style={styles.wrap}>
            {boats.map((b) => (
              <Chip key={b.id} label={[b.name, b.make, b.model].filter(Boolean).join(" · ")} selected={boatId === b.id} onPress={() => setBoatId(b.id)} />
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Where should the work happen?</Text>
      <View style={styles.wrap}>
        {WORK_LOCATIONS.map((w) => (
          <Chip key={w.value} label={w.label} selected={workLocation === w.value} onPress={() => setWorkLocation(workLocation === w.value ? "" : w.value)} />
        ))}
      </View>

      <Text style={styles.label}>Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.sm }}>
        {photos.map((p, i) => (
          <Pressable key={p.uri} onLongPress={() => Alert.alert("Remove photo?", undefined, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: () => setPhotos((prev) => prev.filter((_, j) => j !== i)) }])}>
            <Image source={{ uri: p.uri }} style={{ width: 88, height: 88, borderRadius: radius.sm, marginRight: space.sm }} />
          </Pressable>
        ))}
      </ScrollView>
      <Row style={{ marginBottom: space.lg }}>
        <Button title="Take photo" tone="secondary" onPress={addFromCamera} disabled={photos.length >= 6} style={{ flex: 1 }} />
        <Button title="Choose from library" tone="secondary" onPress={addFromLibrary} disabled={photos.length >= 6} style={{ flex: 1 }} />
      </Row>
      {photos.length > 0 && <Muted style={{ marginBottom: space.md }}>Long-press a photo to remove it.</Muted>}

      <ErrorText>{error}</ErrorText>
      <Button title="Post job" onPress={submit} loading={busy} />
      <Muted style={{ marginTop: space.md }}>Shops see your town and the boat, never the exact slip. Your contact details go only to the shop you accept.</Muted>
    </Screen>
  );
}

const styles = {
  label: { fontSize: 12, fontWeight: "600" as const, color: colors.text, marginBottom: 6 },
  wrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: space.md },
};
