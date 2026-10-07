// A shop's public profile and what owners said about it.
import { Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatMiles } from "@bosun/shared/geo";
import { browseOrigin, vendorCard } from "@bosun/shared/vendors/browse";
import { reviewSummary } from "@bosun/shared/vendors/reviews";
import { useAuth } from "@/lib/auth";
import { useMyBoats } from "@/lib/boats";
import { mapsUrl } from "@/lib/location";
import { colors, space } from "@/lib/theme";
import { useVendorProfile, useVendorReviews } from "@/lib/vendors";
import { Badge, Button, Card, Loading, Muted, Row, Screen } from "@/ui";
import { SectionTitle, StatTile, Stars, formatDate } from "@/ui/pickers";

export default function VendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { active } = useMyBoats();
  const { data: row, isLoading, isError } = useVendorProfile(id);
  const { data: reviews = [] } = useVendorReviews(id);
  if (isLoading) return <Loading />;
  if (isError || !row) return <Screen><Muted>That shop isn't on Bosun any more.</Muted></Screen>;
  const v = vendorCard(row, browseOrigin(active, profile));
  const rating = reviewSummary(reviews);

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center", marginBottom: space.md }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.white, fontWeight: "700", fontSize: 20 }}>{v.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.navy, flexShrink: 1 }}>{v.name}</Text>
            {v.verified && <Ionicons name="checkmark-circle" size={18} color={colors.sky600} />}
          </Row>
          <Row style={{ gap: 6, marginTop: 2 }}>
            <Stars value={rating.average ?? 0} />
            <Muted>{rating.average != null ? `${rating.average} (${rating.count} review${rating.count === 1 ? "" : "s"})` : "No reviews yet"}</Muted>
          </Row>
          {v.distance != null && <Muted>{formatMiles(v.distance)} from your boat</Muted>}
        </View>
      </View>
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        {v.verified && <Badge tone="sky">Verified by Bosun</Badge>}
        {v.insured && <Badge tone="green">Insured</Badge>}
        {v.licensed && <Badge tone="green">Licensed</Badge>}
      </Row>
      <Row style={{ marginBottom: space.md }}>
        <StatTile label="Jobs on Bosun" value={v.completedJobs} />
        <StatTile label="Years" value={v.yearsInBusiness || "—"} />
        <StatTile label="Responds" value={v.responseTime} />
      </Row>

      {!!v.bio && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 4 }}>About</Text>
          <Text style={{ color: colors.text, lineHeight: 20 }}>{v.bio}</Text>
        </Card>
      )}
      {v.specialties.length > 0 && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: space.sm }}>Specialties</Text>
          <Row style={{ flexWrap: "wrap" }}>{v.specialties.map((s) => <Badge key={s} tone="muted">{s}</Badge>)}</Row>
        </Card>
      )}
      {v.certifications.length > 0 && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: space.sm }}>Certifications</Text>
          <Row style={{ flexWrap: "wrap" }}>{v.certifications.map((s) => <Badge key={s} tone="sky">{s}</Badge>)}</Row>
        </Card>
      )}
      {(!!v.serviceArea || v.lat != null) && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 4 }}>Service area</Text>
          {!!v.serviceArea && <Text style={{ color: colors.text }}>{v.serviceArea}</Text>}
          {v.lat != null && v.lng != null && <Button title="Open in Maps" tone="secondary" onPress={() => Linking.openURL(mapsUrl(v.lat!, v.lng!, v.name))} style={{ marginTop: space.sm }} />}
        </Card>
      )}
      <Row style={{ marginBottom: space.md }}>
        {!!v.phone && <Button title="Call" tone="secondary" onPress={() => Linking.openURL(`tel:${v.phone}`)} style={{ flex: 1 }} />}
        {!!v.website && <Button title="Website" tone="secondary" onPress={() => Linking.openURL(v.website!.startsWith("http") ? v.website! : `https://${v.website}`)} style={{ flex: 1 }} />}
      </Row>
      <Button title="Post a job" onPress={() => router.push("/post")} />
      <Muted style={{ marginTop: space.sm }}>Shops nearby, this one included, get your job and bid on it.</Muted>

      <SectionTitle>Reviews</SectionTitle>
      {reviews.length === 0 && <Muted>No reviews yet. Owners can review a shop after a Bosun job is completed.</Muted>}
      {reviews.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", color: colors.text }}>{r.reviewer?.name ?? "Anonymous"}</Text>
            <Stars value={r.stars} />
          </Row>
          <Muted>{formatDate(r.createdAt.slice(0, 10))}</Muted>
          {!!r.comment && <Text style={{ color: colors.text, marginTop: space.sm, lineHeight: 19 }}>{r.comment}</Text>}
        </Card>
      ))}
    </Screen>
  );
}
