// Revenue: what was booked through Bosun, and what the shop has invoiced and collected.
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Project } from "@bosun/shared/marketplace/types";
import { billingStep, workOrderTotals, type WorkOrder } from "@bosun/shared/shop";
import { bookedJobs, shopMoney } from "@bosun/shared/shop/today";
import { useVendorBidProjects } from "@/lib/queries";
import { useShop, useShopRealtime, useWorkOrders } from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Badge, Card, Loading, Muted, Row, Screen, Title } from "@/ui";
import { StatTile } from "@/ui/pickers";
import { ListHeading, money, shortDate } from "@/ui/shop";

type Bucket = "Booked" | "In progress" | "Completed";
const bucketOf = (p: Project): Bucket => (p.status === "completed" ? "Completed" : p.status === "in-progress" ? "In progress" : "Booked");
const TONE: Record<Bucket, "sky" | "amber" | "green"> = { Booked: "sky", "In progress": "amber", Completed: "green" };

function monthOf(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
}

export default function Revenue() {
  const router = useRouter();
  const { vendorId, isLoading } = useShop();
  useShopRealtime(vendorId);
  const { data: jobs = [] } = useVendorBidProjects(vendorId);
  const { data: orders = [] } = useWorkOrders(vendorId);

  const booked = useMemo(() => (vendorId ? bookedJobs(jobs, vendorId) : []), [jobs, vendorId]);
  const quoted = booked.reduce((s, b) => s + b.price, 0);
  const cash = useMemo(() => shopMoney(orders), [orders]);
  const months = useMemo(() => {
    const map = new Map<string, { label: string; orders: WorkOrder[]; total: number }>();
    for (const o of orders) {
      const step = billingStep(o);
      if (step !== "collect" && step !== "paid") continue;
      const { key, label } = monthOf(o.invoicedAt ?? o.completedAt ?? o.createdAt);
      const g = map.get(key) ?? { label, orders: [], total: 0 };
      g.orders.push(o);
      g.total += workOrderTotals(o.lines, o.taxRate).total;
      map.set(key, g);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [orders]);

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <Title sub="What you've booked, invoiced and been paid.">Revenue</Title>
      <Card style={{ backgroundColor: colors.sky50, borderColor: "#bae6fd" }}>
        <Text style={{ color: "#0c4a6e" }}>
          {booked.length} booked job{booked.length === 1 ? "" : "s"} on Bosun · {money(quoted)} quoted. Bosun does not pay shops yet — collect from the owner.
        </Text>
      </Card>

      <ListHeading>Bosun jobs</ListHeading>
      {booked.length === 0 && <Muted style={{ marginBottom: space.md }}>No jobs won yet.</Muted>}
      {(["Booked", "In progress", "Completed"] as Bucket[]).map((bucket) => {
        const rows = booked.filter((b) => bucketOf(b.project) === bucket);
        if (!rows.length) return null;
        return (
          <View key={bucket} style={{ marginBottom: space.sm }}>
            <Row style={{ marginBottom: space.xs }}>
              <Badge tone={TONE[bucket]}>{bucket}</Badge>
              <Muted>{money(rows.reduce((s, r) => s + r.price, 0))}</Muted>
            </Row>
            {rows.map(({ project, price }) => (
              <Card key={project.id} style={{ padding: space.md }} onPress={() => router.push({ pathname: "/project/[id]", params: { id: project.id } })}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                  <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>{project.title}</Text>
                  <Text style={{ fontWeight: "700", color: colors.navy }}>{money(price)}</Text>
                </View>
                <Muted>{[project.ownerContact?.name ?? project.owner, project.date].filter(Boolean).join(" · ")}</Muted>
              </Card>
            ))}
          </View>
        );
      })}

      <ListHeading>Shop billing</ListHeading>
      <Row style={{ marginBottom: space.sm }}>
        <StatTile label="To invoice" value={money(cash.ready)} tone={cash.ready > 0 ? "amber" : undefined} onPress={() => router.push("/shop/orders")} />
        <StatTile label="Owed" value={money(cash.owed)} tone={cash.owed > 0 ? "sky" : undefined} onPress={() => router.push("/shop/orders")} />
      </Row>
      <Row style={{ marginBottom: space.md }}>
        <StatTile label="Paid this month" value={money(cash.paidMonth)} tone="green" />
        <StatTile label="Done this week" value={money(cash.week)} />
      </Row>
      {months.length === 0 && <Muted>Nothing invoiced yet. Completed work orders show up here once you send the invoice.</Muted>}
      {months.map(([key, g]) => (
        <View key={key} style={{ marginBottom: space.sm }}>
          <Row style={{ justifyContent: "space-between", marginBottom: space.xs }}>
            <Text style={{ fontWeight: "600", color: colors.text }}>{g.label}</Text>
            <Muted>{money(g.total)}</Muted>
          </Row>
          {g.orders.map((o) => {
            const paid = billingStep(o) === "paid";
            return (
              <Card key={o.id} style={{ padding: space.md }} onPress={() => router.push({ pathname: "/shop/order/[id]", params: { id: o.id } })}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                  <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>{o.title || o.number}</Text>
                  <Text style={{ fontWeight: "700", color: paid ? colors.green : colors.navy }}>{money(workOrderTotals(o.lines, o.taxRate).total)}</Text>
                </View>
                <Row style={{ marginTop: 4 }}>
                  <Badge tone={paid ? "green" : "sky"}>{paid ? `Paid ${shortDate(o.paidAt)}${o.paymentMethod ? ` · ${o.paymentMethod}` : ""}` : `Invoiced ${shortDate(o.invoicedAt)}`}</Badge>
                  <Muted numberOfLines={1}>{o.customerName || o.boatLabel}</Muted>
                </Row>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
