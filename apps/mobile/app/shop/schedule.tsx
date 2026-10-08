// The week: who's in which bay each day, double-bookings flagged, unscheduled work at the bottom.
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { occupiesDay, scheduleConflicts, toLocalDateKey, weekDays, type WorkOrder } from "@bosun/shared/shop";
import { useShop, useShopRealtime, useShopSettingsOrDefault, useWorkOrders } from "@/lib/shop";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, Chip, Empty, Loading, Muted, Row, Screen } from "@/ui";
import { WorkOrderBadge, hhmm, timeRange } from "@/ui/shop";

const UNASSIGNED = "Unassigned";

function dayLabel(key: string) {
  const d = new Date(`${key}T12:00:00`);
  return { dow: d.toLocaleDateString("en-US", { weekday: "short" }), date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
}

export default function Schedule() {
  const router = useRouter();
  const { vendorId, isLoading: shopLoading } = useShop();
  useShopRealtime(vendorId);
  const settings = useShopSettingsOrDefault(vendorId);
  const { data: orders = [], isLoading } = useWorkOrders(vendorId);
  const [anchor, setAnchor] = useState(() => new Date());
  const [groupBy, setGroupBy] = useState<"bay" | "tech">("bay");
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const todayKey = toLocalDateKey(new Date().toISOString());

  const conflicts = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of scheduleConflicts(orders)) {
      ids.add(a);
      ids.add(b);
    }
    return ids;
  }, [orders]);

  const lanes = useMemo(() => {
    const fromOrders = orders.map((o) => (groupBy === "bay" ? o.bay : o.assignedTo)).filter(Boolean);
    const base = groupBy === "bay" ? settings.bays : settings.techs;
    return [...new Set([...base, ...fromOrders]), UNASSIGNED];
  }, [orders, settings.bays, settings.techs, groupBy]);

  const unscheduled = orders.filter((o) => !o.scheduledStart && o.status !== "completed" && o.status !== "invoiced");

  const shift = (weeks: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + weeks * 7);
    setAnchor(d);
  };

  const laneOf = (o: WorkOrder) => (groupBy === "bay" ? o.bay : o.assignedTo) || UNASSIGNED;
  const open = (o: WorkOrder) => router.push({ pathname: "/shop/order/[id]", params: { id: o.id } });
  const newAt = (day: string, lane: string) =>
    router.push({ pathname: "/shop/order/[id]", params: { id: "new", day, ...(groupBy === "bay" && lane !== UNASSIGNED ? { bay: lane } : {}) } });

  if (shopLoading || isLoading) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Empty title="No shop yet" body="Finish setting up your shop on getbosun.app to open the schedule." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ marginBottom: space.sm }}>
        <Button title="←" tone="secondary" onPress={() => shift(-1)} />
        <Button title="This week" tone="secondary" onPress={() => setAnchor(new Date())} />
        <Button title="→" tone="secondary" onPress={() => shift(1)} />
        <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>
          {dayLabel(days[0]).date} – {dayLabel(days[6]).date}
        </Text>
      </Row>
      <Row style={{ marginBottom: space.md }}>
        <Chip label="By bay" selected={groupBy === "bay"} onPress={() => setGroupBy("bay")} />
        <Chip label="By tech" selected={groupBy === "tech"} onPress={() => setGroupBy("tech")} />
      </Row>

      {conflicts.size > 0 && (
        <Card style={{ borderColor: colors.red, backgroundColor: colors.red50 }}>
          <Text style={{ color: colors.red, fontSize: 13 }}>{conflicts.size} jobs are double-booked on the same bay or tech. They're outlined in red.</Text>
        </Card>
      )}

      {days.map((k) => {
        const l = dayLabel(k);
        const isToday = k === todayKey;
        const dayOrders = orders.filter((o) => occupiesDay(o, k));
        return (
          <View key={k} style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xs }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: isToday ? colors.sky600 : colors.navy }}>
                {l.dow} {l.date}
                {isToday ? " · Today" : ""}
              </Text>
              <Muted>{dayOrders.length === 0 ? "open" : `${dayOrders.length} job${dayOrders.length === 1 ? "" : "s"}`}</Muted>
            </View>
            <View style={{ backgroundColor: isToday ? colors.sky50 : colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" }}>
              {lanes.map((lane) => {
                const cell = dayOrders.filter((o) => laneOf(o) === lane);
                if (cell.length === 0 && lane === UNASSIGNED) return null;
                return (
                  <View key={lane} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, paddingHorizontal: space.md, gap: space.sm }}>
                    <Text style={{ width: 76, fontSize: 12, fontWeight: "600", color: colors.muted, paddingTop: 6 }} numberOfLines={2}>{lane}</Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      {cell.map((o) => (
                        <Pressable
                          key={o.id}
                          onPress={() => open(o)}
                          style={({ pressed }) => [
                            { backgroundColor: colors.white, borderWidth: 1, borderColor: conflicts.has(o.id) ? colors.red : colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6 },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Row style={{ justifyContent: "space-between" }}>
                            <Muted>{hhmm(o.scheduledStart)}</Muted>
                            <WorkOrderBadge status={o.status} />
                          </Row>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }} numberOfLines={1}>{o.title || o.number}</Text>
                          <Muted numberOfLines={1}>{[o.boatLabel || o.customerName, groupBy === "bay" ? o.assignedTo : o.bay].filter(Boolean).join(" · ")}</Muted>
                        </Pressable>
                      ))}
                      {lane !== UNASSIGNED && (
                        <Pressable onPress={() => newAt(k, lane)} hitSlop={6} style={{ alignSelf: "flex-start", paddingVertical: 2 }}>
                          <Text style={{ color: colors.sky600, fontWeight: "600", fontSize: 13 }}>＋ Book</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      {unscheduled.length > 0 && (
        <>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.navy, marginBottom: space.xs }}>Unscheduled · {unscheduled.length}</Text>
          {unscheduled.map((o) => (
            <Card key={o.id} onPress={() => open(o)}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>{o.title || o.number}</Text>
                <WorkOrderBadge status={o.status} />
              </Row>
              <Muted style={{ marginTop: 2 }}>{[o.boatLabel || o.customerName, timeRange(o.scheduledStart, o.scheduledEnd)].filter(Boolean).join(" · ")}</Muted>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
