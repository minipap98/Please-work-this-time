// The dashboard banner: the active boat's photo (framed the way the owner set it on the web),
// its name, engines and where it is, and a way to switch boats.
import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { boatLabel, boatSubtitle, boatTitle, type BoatRow } from "@bosun/shared/boats/boats";
import { bannerRatio, frameGeometry, parsePhotoFrame } from "@bosun/shared/boats/frame";
import { shortLocation } from "@bosun/shared/profile";
import { colors, radius, space } from "@/lib/theme";

export function FramedPhoto({ boat, style }: { boat: Pick<BoatRow, "photo_url" | "photo_frame">; style?: object }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const frame = parsePhotoFrame(boat.photo_frame);
  const ratio = size ? bannerRatio(size.w, size.h) : 1.6;
  const geometry = size && frame.fit === "cover" ? frameGeometry(frame, size.w / size.h, ratio) : null;
  return (
    <View style={[{ aspectRatio: ratio, backgroundColor: colors.white, overflow: "hidden" }, style]}>
      <Image
        source={{ uri: boat.photo_url! }}
        onLoad={(e) => setSize({ w: e.nativeEvent.source.width, h: e.nativeEvent.source.height })}
        resizeMode={frame.fit === "contain" ? "contain" : "cover"}
        style={
          geometry
            ? { position: "absolute", width: `${geometry.w}%`, height: `${geometry.h}%`, left: `${geometry.left}%`, top: `${geometry.top}%` }
            : { width: "100%", height: "100%" }
        }
      />
    </View>
  );
}

export function HeroBanner({
  boat,
  boats,
  location,
  onPress,
  onSwitch,
  onAddPhoto,
}: {
  boat: BoatRow | null;
  boats: BoatRow[];
  location: string | null | undefined;
  onPress: () => void;
  onSwitch: (id: string) => void;
  onAddPhoto: () => void;
}) {
  const [switching, setSwitching] = useState(false);
  const where = shortLocation(location ?? boat?.home_port);
  return (
    <View style={{ borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.navy, marginBottom: space.lg }}>
      {boat?.photo_url ? (
        <Pressable onPress={onPress}>
          <FramedPhoto boat={boat} />
        </Pressable>
      ) : (
        <Pressable onPress={boat ? onAddPhoto : onPress} style={{ aspectRatio: 2.2, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy600 }}>
          <Ionicons name={boat ? "camera-outline" : "boat-outline"} size={28} color={colors.sky} />
          <Text style={{ color: colors.white, fontWeight: "600", marginTop: 6 }}>{boat ? "Add a photo of your boat" : "Add your boat to get started"}</Text>
        </Pressable>
      )}
      <Pressable onPress={onPress} style={{ padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.white, fontSize: 20, fontWeight: "700" }} numberOfLines={1}>{boatTitle(boat)}</Text>
          {!!boatSubtitle(boat) && <Text style={{ color: "#cbd5e1", fontSize: 13, marginTop: 2 }} numberOfLines={1}>{boatSubtitle(boat)}</Text>}
          {!!where && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={13} color={colors.sky} />
              <Text style={{ color: colors.sky, fontSize: 13 }}>{where}</Text>
            </View>
          )}
        </View>
        {boats.length > 1 && (
          <Pressable onPress={() => setSwitching(true)} hitSlop={8} style={{ padding: 8, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Ionicons name="swap-horizontal" size={20} color={colors.white} />
          </Pressable>
        )}
      </Pressable>
      <Modal visible={switching} animationType="slide" onRequestClose={() => setSwitching(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: space.lg }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.navy }}>Which boat?</Text>
            <Pressable onPress={() => setSwitching(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.navy} />
            </Pressable>
          </View>
          {[...boats].reverse().map((b) => (
            <Pressable
              key={b.id}
              onPress={() => {
                onSwitch(b.id);
                setSwitching(false);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              {b.photo_url ? <Image source={{ uri: b.photo_url }} style={{ width: 44, height: 44, borderRadius: radius.sm }} /> : <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" }}><Ionicons name="boat-outline" size={20} color={colors.navy} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{boatTitle(b)}</Text>
                {!!b.name && <Text style={{ color: colors.muted, fontSize: 13 }}>{boatLabel(b)}</Text>}
              </View>
              {b.id === boat?.id && <Ionicons name="checkmark" size={20} color={colors.navy} />}
            </Pressable>
          ))}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
