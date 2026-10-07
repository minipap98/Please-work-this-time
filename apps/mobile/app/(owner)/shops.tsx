// Find a shop: every shop on Bosun, by distance from your boat (or from you).
import { useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatMiles } from "@bosun/shared/geo";
import { DEFAULT_VENDOR_FILTERS, RADIUS_OPTIONS, browseOrigin, filterVendors, specialtyOptions, vendorCard, type VendorFilters, type VendorSort } from "@bosun/shared/vendors/browse";
import { useAuth } from "@/lib/auth";
import { useMyBoats } from "@/lib/boats";
import { deviceLocation } from "@/lib/location";
import { colors, radius, space } from "@/lib/theme";
import { useVendorProfiles } from "@/lib/vendors";
import { Badge, Button, Card, Chip, Empty, Loading, Muted, Row, Screen } from "@/ui";
import { Select } from "@/ui/pickers";

const SORTS: { value: VendorSort; label: string }[] = [
  { value: "distance", label: "Closest first" },
  { value: "jobs", label: "Most jobs done" },
  { value: "response", label: "Fastest response" },
  { value: "experience", label: "Most experienced" },
  { value: "name", label: "A to Z" },
];

export default function Shops() {
  const router = useRouter();
  const { profile } = useAuth();
  const { active } = useMyBoats();
  const { data: rows = [], isLoading, isError } = useVendorProfiles();
  const [f, setF] = useState<VendorFilters>(DEFAULT_VENDOR_FILTERS);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const origin = me ? { ...me, label: "You" as const } : browseOrigin(active, profile);
  const cards = useMemo(() => rows.map((r) => vendorCard(r, origin)), [rows, origin?.lat, origin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => filterVendors(cards, f, !!origin), [cards, f, origin]);
  const specialties = useMemo(() => specialtyOptions(cards), [cards]);
  const set = (patch: Partial<VendorFilters>) => setF((c) => ({ ...c, ...patch }));

  async function nearMe() {
    setLocating(true);
    const pos = await deviceLocation();
    setLocating(false);
    if (pos) setMe(pos);
  }

  if (isLoading) return <Loading />;
  return (
    <Screen scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(v) => v.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.faint} />
              <TextInput style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text }} value={f.search} onChangeText={(v) => set({ search: v })} placeholder="Shop, specialty or area" placeholderTextColor={colors.faint} autoCorrect={false} />
              <Button title={filtersOpen ? "Done" : "Filters"} tone="ghost" onPress={() => setFiltersOpen((o) => !o)} />
            </View>
            <Row style={{ marginBottom: space.sm, flexWrap: "wrap" }}>
              <Muted>{origin ? `From ${origin.label.toLowerCase() === "you" ? "you" : "your boat"} · ` : "Add a home port to see distances · "}</Muted>
              <Chip label={locating ? "Locating…" : "Near me"} selected={!!me} onPress={me ? () => setMe(null) : nearMe} />
            </Row>
            {origin && (
              <Row style={{ marginBottom: space.sm, flexWrap: "wrap" }}>
                {RADIUS_OPTIONS.map((r) => (
                  <Chip key={r.label} label={r.label} selected={f.radiusMiles === r.miles} onPress={() => set({ radiusMiles: r.miles })} />
                ))}
              </Row>
            )}
            {filtersOpen && (
              <Card>
                <Select label="Specialty" value={f.specialty ?? ""} options={specialties} placeholder="Any" onChange={(v) => set({ specialty: v || null })} />
                <Select label="Sort" value={SORTS.find((s) => s.value === f.sort)?.label ?? ""} options={SORTS.filter((s) => s.value !== "distance" || origin).map((s) => s.label)} onChange={(v) => set({ sort: SORTS.find((s) => s.label === v)?.value ?? "jobs" })} />
                <Row style={{ flexWrap: "wrap" }}>
                  <Chip label="Insured" selected={f.insuredOnly} onPress={() => set({ insuredOnly: !f.insuredOnly })} />
                  <Chip label="Licensed" selected={f.licensedOnly} onPress={() => set({ licensedOnly: !f.licensedOnly })} />
                  {!!f.specialty && <Chip label="Clear" selected={false} onPress={() => setF({ ...DEFAULT_VENDOR_FILTERS, search: f.search })} />}
                </Row>
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={isError ? <Empty title="Couldn't load shops" /> : <Empty title="No shops match" body={origin && Number.isFinite(f.radiusMiles) ? "Try a wider radius." : "Try another search."} />}
        renderItem={({ item: v }) => (
          <Card onPress={() => router.push({ pathname: "/vendor/[id]", params: { id: v.id } })}>
            <View style={{ flexDirection: "row", gap: space.md }}>
              <View style={styles.avatar}>
                <Text style={{ color: colors.white, fontWeight: "700" }}>{v.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Row style={{ gap: 6 }}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text, flexShrink: 1 }} numberOfLines={1}>{v.name}</Text>
                  {v.verified && <Ionicons name="checkmark-circle" size={16} color={colors.sky600} />}
                </Row>
                <Muted>{v.distance != null ? `${formatMiles(v.distance)} away` : v.serviceArea.split("·")[0].trim() || "Service area not listed"}{v.responseTime !== "—" ? ` · responds ${v.responseTime}` : ""}</Muted>
                <Muted>{v.completedJobs} job{v.completedJobs === 1 ? "" : "s"} on Bosun{v.yearsInBusiness ? ` · ${v.yearsInBusiness} yrs in business` : ""}</Muted>
              </View>
            </View>
            <Row style={{ marginTop: space.sm, flexWrap: "wrap" }}>
              {v.insured && <Badge tone="green">Insured</Badge>}
              {v.licensed && <Badge tone="green">Licensed</Badge>}
              {v.specialties.slice(0, 3).map((s) => (
                <Badge key={s} tone="muted">{s}</Badge>
              ))}
              {v.specialties.length > 3 && <Badge tone="muted">+{v.specialties.length - 3}</Badge>}
            </Row>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = {
  search: { flexDirection: "row" as const, alignItems: "center" as const, gap: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, paddingLeft: 10, marginBottom: space.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: "center" as const, justifyContent: "center" as const },
};
