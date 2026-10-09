// The Boat Log: every job on a boat, owner-logged or shop-verified, with a share link.
import { useMemo, useState } from "react";
import { Alert, Share, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { isHoursReading, isPreviousOwnerEntry, isVerified, spendByOwnership, summarizeLog, type LogEntry } from "@bosun/shared/boatLog";
import { LOG_CATEGORIES } from "@bosun/shared/boatLog/records";
import { historyShareUrl } from "@bosun/shared/boatLog/shares";
import { boatTitle } from "@bosun/shared/boats/boats";
import { useBoatLog, useHistoryShare, useReceiptInbox, useShareActions } from "@/lib/boatLog";
import { useMyBoats } from "@/lib/boats";
import { SITE_URL } from "@/lib/env";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Chip, Empty, Loading, Muted, Row, Screen } from "@/ui";
import { LinkRow, SectionTitle, StatTile, SwitchRow, formatDate, money } from "@/ui/pickers";

type Filter = "all" | "verified" | "owner";

export default function BoatLogScreen() {
  const { boat: boatParam } = useLocalSearchParams<{ boat?: string }>();
  const router = useRouter();
  const { boats, active, isLoading: boatsLoading, setActiveId } = useMyBoats();
  const boat = boats.find((b) => b.id === boatParam) ?? active;
  const { data: entries = [] } = useBoatLog(boat?.id);
  const { data: receipts = [] } = useReceiptInbox();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sharing, setSharing] = useState(false);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === "verified" && !isVerified(e)) return false;
      if (filter === "owner" && isVerified(e)) return false;
      if (category && e.category !== category) return false;
      if (t && ![e.title, e.vendorName, e.notes, ...e.lines.map((l) => l.description)].some((s) => s && s.toLowerCase().includes(t))) return false;
      return true;
    });
  }, [entries, filter, category, q]);
  const byYear = useMemo(() => {
    const groups = new Map<string, LogEntry[]>();
    for (const e of visible) {
      const y = e.date.slice(0, 4);
      groups.set(y, [...(groups.get(y) ?? []), e]);
    }
    return [...groups.entries()];
  }, [visible]);

  if (boatsLoading) return <Loading />;
  if (!boat) {
    return (
      <Screen>
        <Empty title="Add your boat first" body="The Boat Log keeps every service on a boat in one place." />
        <Button title="Add a boat" onPress={() => router.push("/boat/new")} />
      </Screen>
    );
  }
  const summary = summarizeLog(entries);
  // Once a boat has changed hands, "spent" means two things.
  const ownedSince = boat.owned_since ?? boat.created_at;
  const spend = spendByOwnership(entries, ownedSince);
  const changedHands = spend.previous.entries > 0;
  const short = (n: number) => (n ? money(n).replace(/\.00$/, "") : "—");

  return (
    <Screen>
      {boats.length > 1 && (
        <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
          {[...boats].reverse().map((b) => (
            <Chip key={b.id} label={boatTitle(b)} selected={b.id === boat.id} onPress={() => { setActiveId(b.id); router.setParams({ boat: b.id }); }} />
          ))}
        </Row>
      )}
      <Row style={{ marginBottom: space.md }}>
        <StatTile label="Services" value={summary.entries} />
        <StatTile label="By shops" value={summary.verified} tone="green" />
        {changedHands ? (
          <>
            <StatTile label="Your spend" value={short(spend.mine.total)} />
            <StatTile label="All owners" value={short(spend.allTime.total)} />
          </>
        ) : (
          <StatTile label="Spent" value={short(summary.totalSpent)} />
        )}
      </Row>
      {changedHands && <Muted style={{ marginTop: -space.sm, marginBottom: space.md }}>Yours since {formatDate(spend.since)} · {spend.previous.entries} earlier entr{spend.previous.entries === 1 ? "y" : "ies"} from previous owners{spend.previous.unpriced ? `, ${spend.previous.unpriced} without a price` : ""}</Muted>}
      <Row style={{ marginBottom: space.md }}>
        <Button title="Log work" onPress={() => router.push({ pathname: "/log/new", params: { boat: boat.id } })} style={{ flex: 1 }} />
        <Button title="Import invoice" tone="secondary" onPress={() => router.push({ pathname: "/log/import", params: { boat: boat.id } })} style={{ flex: 1 }} />
        <Button title={sharing ? "Close" : "Share"} tone="secondary" onPress={() => setSharing((s) => !s)} />
      </Row>
      {sharing && <ShareCard boatId={boat.id} />}
      <LinkRow
        icon="speedometer-outline"
        title={summary.latestEngineHours != null ? `${summary.latestEngineHours} engine hours` : "Engine hours not recorded"}
        sub="Tap to update the meter reading"
        onPress={() => router.push({ pathname: "/log/hours", params: { boat: boat.id } })}
      />
      {receipts.length > 0 && (
        <LinkRow icon="mail-unread-outline" title={`${receipts.length} emailed receipt${receipts.length === 1 ? "" : "s"} to review`} sub="Forwarded receipts, read and waiting for your OK." onPress={() => router.push("/receipts")} />
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, paddingHorizontal: 10, marginBottom: space.sm }}>
        <Ionicons name="search" size={16} color={colors.faint} />
        <TextInput style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text }} value={q} onChangeText={setQ} placeholder="Search work, shops, parts" placeholderTextColor={colors.faint} autoCorrect={false} />
      </View>
      <Row style={{ marginBottom: space.sm, flexWrap: "wrap" }}>
        {(["all", "verified", "owner"] as Filter[]).map((f) => (
          <Chip key={f} label={f === "all" ? "All" : f === "verified" ? "Shop-verified" : "Logged by me"} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </Row>
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        {LOG_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
        ))}
      </Row>

      {entries.length === 0 && <Empty title="Nothing logged yet" body="Log work you did yourself, import an old invoice, or complete a Bosun job and it lands here verified." />}
      {entries.length > 0 && visible.length === 0 && <Empty title="No matches" />}
      {byYear.map(([year, list]) => (
        <View key={year}>
          <SectionTitle>{year}</SectionTitle>
          {list.map((e) => (
            <Card key={e.id} onPress={() => router.push({ pathname: "/log/[id]", params: { id: e.id, boat: boat.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={2}>{isHoursReading(e) ? `Engine hours: ${e.engineHours ?? "—"}` : e.title}</Text>
                <Text style={{ fontWeight: "700", color: colors.navy }}>{e.cost != null ? money(e.cost) : ""}</Text>
              </View>
              <Muted style={{ marginTop: 2 }}>{formatDate(e.date)}{e.vendorName ? ` · ${e.vendorName}` : " · Owner"}{e.engineHours != null ? ` · ${e.engineHours} hrs` : ""}</Muted>
              <Row style={{ marginTop: space.sm, flexWrap: "wrap" }}>
                {isVerified(e) ? <Badge tone="green">Verified{e.source === "bosun-job" ? " · Bosun job" : " · shop"}</Badge> : <Badge tone="muted">Owner</Badge>}
                {changedHands && isPreviousOwnerEntry(e, ownedSince) && <Badge tone="amber">Previous owner</Badge>}
                {!!e.category && <Badge tone="sky">{e.category}</Badge>}
                {!!e.invoicePath && <Badge tone="muted">Invoice</Badge>}
              </Row>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

function ShareCard({ boatId }: { boatId: string }) {
  const { data: share, isLoading } = useHistoryShare(boatId);
  const { create, setCosts, revoke } = useShareActions(boatId);
  const [showCosts, setShowCosts] = useState(false);
  if (isLoading) return <Loading />;
  const url = share ? historyShareUrl(SITE_URL, share.token) : null;
  return (
    <Card style={{ borderColor: colors.sky }}>
      <Text style={{ fontWeight: "700", color: colors.navy }}>Share the service history</Text>
      <Muted style={{ marginTop: 2, marginBottom: space.sm }}>A link a buyer or surveyor can open. It shows dates, work and which shop did it; never your notes, your name or invoices.</Muted>
      {share ? (
        <>
          <Text selectable style={{ color: colors.sky600, marginBottom: space.sm }}>{url}</Text>
          <SwitchRow label="Show what each job cost" value={share.showCosts} onChange={(v) => setCosts.mutate({ shareId: share.id, showCosts: v })} />
          <Row style={{ marginTop: space.sm }}>
            <Button title="Send link" onPress={() => Share.share({ message: url!, url: url! })} style={{ flex: 1 }} />
            <Button
              title="Turn off"
              tone="secondary"
              onPress={() => Alert.alert("Turn the link off?", "Anyone who has it will see that it's no longer shared.", [{ text: "Cancel" }, { text: "Turn off", style: "destructive", onPress: () => revoke.mutate(share.id) }])}
              loading={revoke.isPending}
            />
          </Row>
        </>
      ) : (
        <>
          <SwitchRow label="Show what each job cost" value={showCosts} onChange={setShowCosts} />
          <Button title="Create link" onPress={() => create.mutate(showCosts)} loading={create.isPending} style={{ marginTop: space.sm }} />
        </>
      )}
    </Card>
  );
}
