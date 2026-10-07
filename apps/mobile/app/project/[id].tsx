import { useEffect, useState } from "react";
import { Alert, Image, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BOOKING_TIME_OPTIONS, makeBooking, serviceWeekOptions } from "@bosun/shared/marketplace/booking";
import type { Bid, Project } from "@bosun/shared/marketplace/types";
import { useAuth } from "@/lib/auth";
import { useAcceptBid, useMarkBidsSeen, useMyVendorProfile, useProject, useSetBidRejected, useUpdateProjectStatus } from "@/lib/queries";
import { colors, radius, space } from "@/lib/theme";
import { Badge, Button, Card, Chip, Field, Loading, Muted, Row, Screen, Title } from "@/ui";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function expired(bid: Bid): boolean {
  if (!bid.expiryDate || bid.expiryDate === "TBD") return false;
  const t = new Date(bid.expiryDate).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { data: project, isLoading } = useProject(id);
  const { data: myShop } = useMyVendorProfile();
  const accept = useAcceptBid();
  const reject = useSetBidRejected();
  const markSeen = useMarkBidsSeen();
  const updateStatus = useUpdateProjectStatus();
  const isOwner = !!project && project.ownerId === user?.id;
  const isVendor = profile?.role === "vendor";

  useEffect(() => {
    if (project && isOwner && project.bids.some((b) => b.seenAt === null)) markSeen.mutate(project.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.bids.length, isOwner]);

  // Accept flow: pick a week and a time, then the RPC does the rest.
  const [accepting, setAccepting] = useState<Bid | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const weeks = serviceWeekOptions();

  async function confirmAccept() {
    if (!project || !accepting || week === null || !time) return;
    const booking = makeBooking({ bidId: accepting.id, vendorName: accepting.vendorName, week: weeks[week], timeId: time, notes });
    try {
      await accept.mutateAsync({ projectId: project.id, bidId: accepting.id, booking: booking as unknown as Record<string, unknown> });
      setAccepting(null);
    } catch (e) {
      Alert.alert("Couldn't accept this bid", e instanceof Error ? e.message : String(e));
    }
  }

  if (isLoading || !project) return <Loading />;

  const chosen = project.bids.find((b) => b.id === project.chosenBidId);
  const open = project.status === "active" || project.status === "bidding" || project.status === "gathering";
  const mine = isVendor ? project.bids.find((b) => b.vendorProfileId === myShop?.id) : undefined;
  const wonByMe = !!mine && project.chosenBidId === mine.id;

  return (
    <Screen>
      <Title sub={`Posted ${project.date}${project.location ? ` · ${project.location}` : ""}`}>{project.title}</Title>
      <Row style={{ marginBottom: space.md }}>
        <Badge tone={project.status === "completed" ? "green" : project.status === "in-progress" ? "amber" : open ? "sky" : "muted"}>
          {project.status === "in-progress" ? "In progress" : project.status === "completed" ? "Completed" : open ? "Taking bids" : project.status}
        </Badge>
        {project.category && <Badge tone="muted">{project.category}</Badge>}
      </Row>
      {!!project.description && <Text style={{ color: colors.text, lineHeight: 20, marginBottom: space.md }}>{project.description}</Text>}
      {project.boat && (
        <Muted style={{ marginBottom: space.md }}>
          {[project.boat.name && `"${project.boat.name}"`, project.boat.year, project.boat.make, project.boat.model, project.boat.propulsion].filter(Boolean).join(" · ")}
        </Muted>
      )}
      {project.photos && project.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.lg }}>
          {project.photos.map((url) => (
            <Image key={url} source={{ uri: url }} style={{ width: 160, height: 120, borderRadius: radius.sm, marginRight: space.sm }} />
          ))}
        </ScrollView>
      )}

      {wonByMe && project.ownerContact && (
        <Card style={{ borderColor: colors.green, backgroundColor: colors.green50 }}>
          <Text style={{ fontWeight: "700", color: colors.green }}>The job is yours</Text>
          <Text style={{ marginTop: 4 }}>{project.ownerContact.name}</Text>
          {project.ownerContact.phone && <Text style={{ color: colors.sky600 }} onPress={() => Linking.openURL(`tel:${project.ownerContact!.phone}`)}>{project.ownerContact.phone}</Text>}
          {project.ownerContact.email && <Text style={{ color: colors.sky600 }} onPress={() => Linking.openURL(`mailto:${project.ownerContact!.email}`)}>{project.ownerContact.email}</Text>}
          {project.booking && <Muted style={{ marginTop: space.sm }}>Window: {String(project.booking.week)} · {String(project.booking.time)}</Muted>}
        </Card>
      )}

      {isOwner && chosen && project.booking && (
        <Card style={{ borderColor: colors.sky }}>
          <Text style={{ fontWeight: "700", color: colors.navy }}>Booked with {chosen.vendorName}</Text>
          <Muted style={{ marginTop: 2 }}>{String(project.booking.week)} · {String(project.booking.time)} · {money(chosen.price)}</Muted>
          {chosen.vendorPhone && <Text style={{ color: colors.sky600, marginTop: space.sm }} onPress={() => Linking.openURL(`tel:${chosen.vendorPhone}`)}>Call {chosen.vendorPhone}</Text>}
          {project.status === "in-progress" && (
            <Button
              title="Mark as completed"
              tone="secondary"
              style={{ marginTop: space.md }}
              onPress={() =>
                Alert.alert("Mark this job completed?", "It goes into your Boat Log as verified work.", [
                  { text: "Cancel" },
                  { text: "Complete", onPress: () => updateStatus.mutate({ projectId: project.id, status: "completed" }) },
                ])
              }
            />
          )}
        </Card>
      )}

      {isVendor && !mine && open && (
        <Button title="Place a bid" onPress={() => router.push({ pathname: "/bid/[projectId]", params: { projectId: project.id } })} style={{ marginBottom: space.lg }} />
      )}

      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.navy, marginBottom: space.sm }}>
        {isOwner ? `${project.bids.length} bid${project.bids.length === 1 ? "" : "s"}` : mine ? "Your bid" : `${project.bids.length} bid${project.bids.length === 1 ? "" : "s"} so far`}
      </Text>
      {(isOwner ? project.bids : mine ? [mine] : []).map((bid) => (
        <BidCard key={bid.id} bid={bid} project={project} isOwner={isOwner} open={open} onAccept={() => { setAccepting(bid); setWeek(null); setTime(null); setNotes(""); }} onDecline={(rejected) => reject.mutate({ bidId: bid.id, rejected })} onMessage={() => router.push({ pathname: "/thread/[bidId]", params: { bidId: bid.id } })} />
      ))}
      {isOwner && project.bids.length === 0 && <Muted>No bids yet. Shops nearby have been told about this job.</Muted>}

      {accepting && (
        <Card style={{ borderColor: colors.sky, marginTop: space.lg }}>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 4 }}>When works for you?</Text>
          <Muted style={{ marginBottom: space.md }}>{accepting.vendorName} · {money(accepting.price)}</Muted>
          <View style={{ gap: 8, marginBottom: space.md }}>
            {weeks.map((w) => (
              <Chip key={w.index} label={`${w.label}  (${w.sublabel})`} selected={week === w.index} onPress={() => setWeek(w.index)} />
            ))}
          </View>
          <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
            {BOOKING_TIME_OPTIONS.map((t) => (
              <Chip key={t.id} label={`${t.label} · ${t.sub}`} selected={time === t.id} onPress={() => setTime(t.id)} />
            ))}
          </Row>
          <Field label="Notes for the shop (optional)" value={notes} onChangeText={setNotes} placeholder="Gate code, where the keys are…" />
          <Row>
            <Button title="Cancel" tone="secondary" onPress={() => setAccepting(null)} style={{ flex: 1 }} />
            <Button title="Confirm booking" onPress={confirmAccept} loading={accept.isPending} disabled={week === null || !time} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}
    </Screen>
  );
}

function BidCard({ bid, project, isOwner, open, onAccept, onDecline, onMessage }: { bid: Bid; project: Project; isOwner: boolean; open: boolean; onAccept: () => void; onDecline: (rejected: boolean) => void; onMessage: () => void }) {
  const chosen = bid.id === project.chosenBidId;
  const withdrawn = bid.withdrawnAt != null;
  const isExpired = expired(bid);
  const canAct = isOwner && open && !chosen && !withdrawn;
  return (
    <Card style={[chosen && { borderColor: colors.sky }, (withdrawn || bid.rejected) && { opacity: 0.6 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", color: colors.text }}>{bid.vendorName}</Text>
          <Muted>{bid.reviewCount} completed job{bid.reviewCount === 1 ? "" : "s"} · valid until {bid.expiryDate}</Muted>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.navy }}>{money(bid.price)}</Text>
      </View>
      <Row style={{ marginTop: 6, flexWrap: "wrap" }}>
        {chosen && <Badge tone="green">Accepted</Badge>}
        {withdrawn && <Badge tone="muted">Withdrawn</Badge>}
        {bid.rejected && !chosen && <Badge tone="red">Declined</Badge>}
        {isExpired && !chosen && <Badge tone="amber">Expired</Badge>}
      </Row>
      {!!bid.message && <Text style={{ color: colors.text, marginTop: space.sm, lineHeight: 19 }}>{bid.message}</Text>}
      {bid.lineItems && bid.lineItems.length > 0 && (
        <View style={{ marginTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm }}>
          {bid.lineItems.map((li, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
              <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={1}>{li.quantity > 1 ? `${li.quantity} × ` : ""}{li.description}</Text>
              <Text style={{ color: colors.text }}>{money(li.quantity * li.unitPrice)}</Text>
            </View>
          ))}
        </View>
      )}
      <Row style={{ marginTop: space.md }}>
        {canAct && !bid.rejected && <Button title="Decline" tone="secondary" onPress={() => onDecline(true)} style={{ flex: 1 }} />}
        {canAct && bid.rejected && <Button title="Undo decline" tone="secondary" onPress={() => onDecline(false)} style={{ flex: 1 }} />}
        {canAct && !bid.rejected && <Button title={isExpired ? "Expired" : "Accept"} disabled={isExpired} onPress={onAccept} style={{ flex: 1 }} />}
        <Button title="Message" tone="ghost" onPress={onMessage} />
      </Row>
    </Card>
  );
}
