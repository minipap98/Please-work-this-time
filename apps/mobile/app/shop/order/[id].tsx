// One work order: who, what, when, the lines and the money, then billing once it's done.
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Project } from "@bosun/shared/marketplace/types";
import {
  PAYMENT_METHODS,
  WORK_ORDER_STATUSES,
  billingStep,
  boatLabel,
  workOrderTotals,
  type LineKind,
  type ShopBoat,
  type ShopCustomer,
  type WorkOrderLine,
  type WorkOrderStatus,
} from "@bosun/shared/shop";
import { blankWorkOrder, draftFromOrder, invoiceText, nextWorkOrderNumber } from "@bosun/shared/shop/drafts";
import { useProject } from "@/lib/queries";
import {
  useBillWorkOrder,
  useCustomers,
  useDeleteWorkOrder,
  useInventory,
  useSaveCustomer,
  useSaveWorkOrder,
  useSetWorkOrderStatus,
  useShipments,
  useShop,
  useShopBoats,
  useShopSettingsOrDefault,
  useWorkOrders,
  type WorkOrderDraft,
} from "@/lib/shop";
import { colors, space } from "@/lib/theme";
import { Button, Card, Chip, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { Select } from "@/ui/pickers";
import { DateTimeField, KV, ListHeading, NumberField, ShipmentBadge, WorkOrderBadge, money, shortDate } from "@/ui/shop";

const NOT_ON_FILE = "Not on file";
const OTHER_BOAT = "Other boat";
const SPECIAL_ORDER = "Special order";

function at(day: string, hour: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0).toISOString();
}

function jobBoatLabel(job: Project): string {
  const b = job.boat;
  if (!b) return "";
  return `${[b.year, b.make, b.model].filter(Boolean).join(" ")}${b.name ? ` · ${b.name}` : ""}`;
}

let lineSeq = 0;
const lineKey = () => `l${++lineSeq}`;

export default function WorkOrderEditor() {
  const router = useRouter();
  const { id, project: projectId, day, bay: bayParam, customer: customerParam } = useLocalSearchParams<{ id: string; project?: string; day?: string; bay?: string; customer?: string }>();
  const isNew = id === "new";
  const { vendorId, shopName, isLoading: shopLoading } = useShop();
  const settings = useShopSettingsOrDefault(vendorId);
  const { data: orders = [], isLoading: ordersLoading } = useWorkOrders(vendorId);
  const { data: customers = [], isLoading: customersLoading } = useCustomers(vendorId);
  const { data: boats = [], isLoading: boatsLoading } = useShopBoats(vendorId);
  const { data: inventory = [] } = useInventory(vendorId);
  const { data: shipments = [] } = useShipments(vendorId);
  const { data: job, isLoading: jobLoading } = useProject(projectId || undefined);
  const save = useSaveWorkOrder(vendorId);
  const saveCustomer = useSaveCustomer(vendorId);
  const setStatus = useSetWorkOrderStatus(vendorId);
  const remove = useDeleteWorkOrder(vendorId);
  const bill = useBillWorkOrder(vendorId);

  const order = isNew ? undefined : orders.find((o) => o.id === id);
  const [d, setD] = useState<WorkOrderDraft | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<string>(PAYMENT_METHODS[0]);

  const ready = !shopLoading && !ordersLoading && !customersLoading && !boatsLoading && (!projectId || !jobLoading);

  // Build the draft once everything it depends on has loaded.
  useEffect(() => {
    if (d || !ready || !vendorId) return;
    let cancelled = false;
    (async () => {
      let draft: WorkOrderDraft;
      if (!isNew) {
        if (!order) return;
        draft = draftFromOrder(order);
      } else {
        draft = blankWorkOrder(nextWorkOrderNumber(orders), settings);
        if (day) {
          draft.scheduledStart = at(day, 8);
          draft.scheduledEnd = at(day, 12);
        }
        if (bayParam && bayParam !== "Unassigned") draft.bay = bayParam;
        const fromCustomer = customerParam ? customers.find((c) => c.id === customerParam) : undefined;
        if (fromCustomer) {
          draft.customerName = fromCustomer.name;
          draft.customerEmail = fromCustomer.email;
        }
        if (job) draft = await fromJob(job, draft);
      }
      if (cancelled) return;
      const boat = draft.boatId ? boats.find((b) => b.id === draft.boatId) : undefined;
      const norm = (x: string) => x.trim().toLowerCase();
      const cust =
        (boat && customers.find((c) => c.id === boat.customerId)) ??
        customers.find((c) => draft.customerEmail && norm(c.email) === norm(draft.customerEmail)) ??
        customers.find((c) => norm(c.name) === norm(draft.customerName));
      setCustomerId(cust?.id ?? null);
      setKeys(draft.lines.map(() => lineKey()));
      setD(draft);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, vendorId, order?.id, job?.id]);

  // Billing and status buttons change the row underneath the draft; keep the chips honest so a
  // later Save can't quietly move a completed job back to scheduled.
  useEffect(() => {
    if (order && d && d.status !== order.status) setD((p) => (p ? { ...p, status: order.status } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  /** A won Bosun job already knows the owner and the boat: put them on file (or match them) and prefill. */
  async function fromJob(job: Project, base: WorkOrderDraft): Promise<WorkOrderDraft> {
    const label = jobBoatLabel(job);
    const ownerName = job.ownerContact?.name ?? job.owner ?? "";
    const ownerEmail = job.ownerContact?.email ?? "";
    const norm = (x: string) => x.trim().toLowerCase();
    let boatId: string | null = boats.find((b) => boatLabel(b) === label)?.id ?? null;
    if (!boatId && job.boat && ownerName) {
      try {
        const existing = customers.find((c) => ownerEmail && norm(c.email) === norm(ownerEmail)) ?? customers.find((c) => norm(c.name) === norm(ownerName));
        const engine = [job.boat.engineMake, job.boat.engineModel].filter(Boolean).join(" ") || job.boat.propulsion || "";
        const res = await saveCustomer.mutateAsync({
          customer: existing ? { id: existing.id, name: existing.name, email: existing.email || ownerEmail, phone: existing.phone || (job.ownerContact?.phone ?? ""), notes: existing.notes } : { name: ownerName, email: ownerEmail, phone: job.ownerContact?.phone ?? "", notes: "" },
          boats: [{ name: job.boat.name ?? "", year: Number(job.boat.year) || null, make: job.boat.make ?? "", model: job.boat.model ?? "", engine, hullId: job.boat.hullId ?? "", slip: "" }],
        });
        boatId = res.boatIds[0] ?? null;
      } catch {
        // Fall back to free text; the order still saves.
      }
    }
    return {
      ...base,
      title: job.title,
      description: job.description,
      customerName: ownerName,
      customerEmail: ownerEmail,
      boatLabel: label,
      boatId,
      projectId: job.id,
    };
  }

  const set = <K extends keyof WorkOrderDraft>(k: K, v: WorkOrderDraft[K]) => setD((p) => (p ? { ...p, [k]: v } : p));
  const setLine = (i: number, patch: Partial<WorkOrderLine>) => setD((p) => (p ? { ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : p));
  const addLine = (kind: LineKind) => {
    setKeys((k) => [...k, lineKey()]);
    setD((p) =>
      p
        ? {
            ...p,
            lines: [...p.lines, { kind, description: kind === "labor" ? "Labor" : kind === "fee" ? "Shop supplies" : "", quantity: 1, unitPrice: kind === "labor" ? settings.laborRate : 0 }],
          }
        : p,
    );
  };
  const removeLine = (i: number) => {
    setKeys((k) => k.filter((_, j) => j !== i));
    setD((p) => (p ? { ...p, lines: p.lines.filter((_, j) => j !== i) } : p));
  };

  const customerBoats = useMemo(() => (customerId ? boats.filter((b) => b.customerId === customerId) : []), [boats, customerId]);
  const totals = useMemo(() => (d ? workOrderTotals(d.lines, d.taxRate) : null), [d]);

  if (!ready || (!isNew && !order && ordersLoading)) return <Loading />;
  if (!vendorId) {
    return (
      <Screen>
        <Title>No shop yet</Title>
        <Muted>Finish setting up your shop on getbosun.app to open the board.</Muted>
      </Screen>
    );
  }
  if (!isNew && !order) {
    return (
      <Screen>
        <Title>Work order not found</Title>
        <Muted>It may have been deleted on another device.</Muted>
      </Screen>
    );
  }
  if (!d || !totals) return <Loading />;

  const pickCustomer = (c: ShopCustomer | null, typed?: string) => {
    if (c) {
      setCustomerId(c.id);
      set("customerName", c.name);
      set("customerEmail", c.email);
    } else {
      setCustomerId(null);
      set("customerName", typed ?? "");
    }
    set("boatId", null);
    set("boatLabel", "");
  };
  const pickBoat = (b: ShopBoat | null, typed?: string) => {
    set("boatId", b?.id ?? null);
    set("boatLabel", b ? boatLabel(b) : (typed ?? ""));
  };

  async function onSave() {
    if (!d) return;
    if (!d.title.trim()) {
      setError("Give the job a title.");
      return;
    }
    setError(null);
    try {
      const savedId = await save.mutateAsync({ ...d, title: d.title.trim() });
      if (isNew) router.replace({ pathname: "/shop/order/[id]", params: { id: savedId } });
      else Alert.alert("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  function onDelete() {
    if (!order) return;
    Alert.alert(`Delete ${order.number}?`, "Parts on its lines go back on the shelf.", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(order.id);
            router.back();
          } catch (e) {
            Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  const fail = (e: unknown) => Alert.alert("Couldn't update", e instanceof Error ? e.message : String(e));

  async function sendInvoice() {
    if (!order) return;
    const { subject, body } = invoiceText(order, shopName);
    try {
      const res = await Share.share({ message: body, title: subject }, { subject });
      if (res.action === Share.dismissedAction) return;
      await bill.mutateAsync({ id: order.id, action: "invoice" });
    } catch (e) {
      fail(e);
    }
  }

  function emailInvoice() {
    if (!order?.customerEmail) return;
    const { subject, body } = invoiceText(order, shopName);
    Linking.openURL(`mailto:${encodeURIComponent(order.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`).catch(fail);
  }

  const step = order ? billingStep(order) : "not-done";
  const partsForOrder = order ? shipments.filter((s) => s.workOrderId === order.id) : [];
  const customerValue = customerId ? (customers.find((c) => c.id === customerId)?.name ?? d.customerName) : d.customerName;
  const boatValue = d.boatId ? (customerBoats.find((b) => b.id === d.boatId) ? boatLabel(customerBoats.find((b) => b.id === d.boatId)!) : d.boatLabel) : d.boatLabel;

  return (
    <Screen>
      <Title sub={order ? `${order.number} · opened ${shortDate(order.createdAt)}` : d.number}>{isNew ? "New work order" : order?.title || "Work order"}</Title>
      {order && (
        <Row style={{ marginBottom: space.md }}>
          <WorkOrderBadge status={order.status} />
          {order.projectId && <Button title="Open the Bosun job" tone="ghost" onPress={() => router.push({ pathname: "/project/[id]", params: { id: order.projectId! } })} />}
        </Row>
      )}

      <Field label="Title" value={d.title} onChangeText={(v) => set("title", v)} placeholder="Impeller and lower unit oil" />
      <Field label="Notes" multiline value={d.description} onChangeText={(v) => set("description", v)} placeholder="What the customer reported, what to check" />

      <Select
        label="Customer"
        value={customerValue}
        options={customers.map((c) => c.name)}
        other={NOT_ON_FILE}
        placeholder="Pick a customer"
        onChange={(v) => {
          const c = customers.find((x) => x.name === v);
          if (c) pickCustomer(c);
          else pickCustomer(null, v);
        }}
        hint={customerId ? undefined : "Not on file: type the name below. Add them under Customers to keep their boats."}
      />
      {!customerId && <Field label="Customer email" autoCapitalize="none" keyboardType="email-address" value={d.customerEmail} onChangeText={(v) => set("customerEmail", v)} />}
      <Select
        label="Boat"
        value={boatValue}
        options={customerBoats.map(boatLabel)}
        other={OTHER_BOAT}
        placeholder={customerBoats.length ? "Pick a boat" : "Type the boat"}
        onChange={(v) => {
          const b = customerBoats.find((x) => boatLabel(x) === v);
          if (b) pickBoat(b);
          else pickBoat(null, v);
        }}
      />

      <Select label="Tech" value={d.assignedTo} options={settings.techs} other="Someone else" placeholder="Unassigned" onChange={(v) => set("assignedTo", v)} />
      <Select label="Bay" value={d.bay} options={settings.bays} other="Elsewhere" placeholder="No bay" onChange={(v) => set("bay", v)} />
      <DateTimeField label="Starts" value={d.scheduledStart} onChange={(v) => set("scheduledStart", v)} />
      <DateTimeField label="Ends" value={d.scheduledEnd} onChange={(v) => set("scheduledEnd", v)} hint="Leave blank for a one-hour slot." />
      <NumberField label="Engine hours at intake" value={d.engineHours} onChange={(v) => set("engineHours", v)} allowBlank placeholder="410" />
      <NumberField label="Tax rate on parts (%)" value={d.taxRate} onChange={(v) => set("taxRate", v ?? 0)} />

      <ListHeading>Lines</ListHeading>
      {d.lines.map((l, i) => (
        <Card key={keys[i] ?? i}>
          <Row style={{ marginBottom: space.sm }}>
            {(["labor", "part", "fee"] as LineKind[]).map((k) => (
              <Chip key={k} label={k === "labor" ? "Labor" : k === "part" ? "Part" : "Fee"} selected={l.kind === k} onPress={() => setLine(i, { kind: k, inventoryItemId: k === "part" ? l.inventoryItemId : null })} />
            ))}
          </Row>
          {l.kind === "part" && inventory.length > 0 && (
            <Select
              label="From stock"
              value={l.inventoryItemId ? (inventory.find((x) => x.id === l.inventoryItemId)?.name ?? SPECIAL_ORDER) : SPECIAL_ORDER}
              options={[SPECIAL_ORDER, ...inventory.map((x) => x.name)]}
              onChange={(v) => {
                const item = inventory.find((x) => x.name === v);
                if (item) setLine(i, { description: item.name, unitPrice: item.unitPrice, inventoryItemId: item.id });
                else setLine(i, { inventoryItemId: null });
              }}
            />
          )}
          <Field label="Description" value={l.description} onChangeText={(v) => setLine(i, { description: v })} placeholder={l.kind === "labor" ? "Labor" : l.kind === "part" ? "Impeller kit" : "Shop supplies"} />
          <Row>
            <View style={{ flex: 1 }}>
              <NumberField key={`q-${keys[i]}`} label={l.kind === "labor" ? "Hours" : "Qty"} value={l.quantity} onChange={(v) => setLine(i, { quantity: v ?? 0 })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField key={`p-${keys[i]}`} label={l.kind === "labor" ? "Rate" : "Unit price"} value={l.unitPrice} onChange={(v) => setLine(i, { unitPrice: v ?? 0 })} />
            </View>
          </Row>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", color: colors.text }}>{money(l.quantity * l.unitPrice)}</Text>
            <Button title="Remove" tone="ghost" onPress={() => removeLine(i)} />
          </Row>
        </Card>
      ))}
      <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
        <Button title="Add labor" tone="secondary" onPress={() => addLine("labor")} />
        <Button title="Add part" tone="secondary" onPress={() => addLine("part")} />
        <Button title="Add fee" tone="secondary" onPress={() => addLine("fee")} />
      </Row>
      <Card>
        <KV k="Subtotal" v={money(totals.subtotal)} />
        <KV k={`Tax (${d.taxRate}% on parts)`} v={money(totals.tax)} />
        <KV k="Total" v={money(totals.total)} strong />
      </Card>

      <ListHeading>Status</ListHeading>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.md }}>
        {WORK_ORDER_STATUSES.map((s) => (
          <Chip key={s.value} label={s.label} selected={d.status === s.value} onPress={() => set("status", s.value as WorkOrderStatus)} />
        ))}
      </View>

      <ErrorText>{error}</ErrorText>
      <Button title={isNew ? "Create work order" : "Save"} onPress={onSave} loading={save.isPending} />

      {order && (
        <Card style={{ marginTop: space.lg }}>
          <Text style={{ fontWeight: "700", color: colors.navy }}>Billing</Text>
          {step === "not-done" && (
            <>
              <Muted style={{ marginTop: 4, marginBottom: space.md }}>Mark the job complete to invoice it. Completed Bosun jobs go into the owner's Boat Log.</Muted>
              <Button
                title="Mark complete"
                tone="secondary"
                onPress={() =>
                  Alert.alert("Mark this job complete?", undefined, [
                    { text: "Cancel" },
                    { text: "Complete", onPress: () => setStatus.mutate({ id: order.id, status: "completed" }, { onError: fail }) },
                  ])
                }
                loading={setStatus.isPending}
              />
            </>
          )}
          {step === "invoice" && (
            <>
              <Muted style={{ marginTop: 4, marginBottom: space.md }}>Completed {shortDate(order.completedAt)} · {money(workOrderTotals(order.lines, order.taxRate).total)} to invoice.</Muted>
              <Button title="Send invoice" onPress={sendInvoice} loading={bill.isPending} />
              {!!order.customerEmail && <Button title={`Email ${order.customerEmail}`} tone="ghost" onPress={emailInvoice} />}
            </>
          )}
          {step === "collect" && (
            <>
              <Muted style={{ marginTop: 4, marginBottom: space.sm }}>Invoiced {shortDate(order.invoicedAt)} · {money(workOrderTotals(order.lines, order.taxRate).total)} owed.</Muted>
              <Row style={{ flexWrap: "wrap", marginBottom: space.md }}>
                {PAYMENT_METHODS.map((m) => (
                  <Chip key={m} label={m} selected={payMethod === m} onPress={() => setPayMethod(m)} />
                ))}
              </Row>
              <Button
                title="Mark paid"
                onPress={() =>
                  Alert.alert(`Paid by ${payMethod}?`, undefined, [
                    { text: "Cancel" },
                    { text: "Mark paid", onPress: () => bill.mutate({ id: order.id, action: "paid", method: payMethod }, { onError: fail }) },
                  ])
                }
                loading={bill.isPending}
              />
              {!!order.customerEmail && <Button title="Resend invoice" tone="ghost" onPress={emailInvoice} />}
            </>
          )}
          {step === "paid" && (
            <>
              <Muted style={{ marginTop: 4, marginBottom: space.md }}>Paid {shortDate(order.paidAt)}{order.paymentMethod ? ` by ${order.paymentMethod}` : ""}.</Muted>
              <Button title="Undo paid" tone="ghost" onPress={() => bill.mutate({ id: order.id, action: "unpaid" }, { onError: fail })} />
            </>
          )}
        </Card>
      )}

      {order && (
        <>
          <ListHeading>Parts for this job</ListHeading>
          {partsForOrder.length === 0 && <Muted style={{ marginBottom: space.sm }}>Nothing ordered yet.</Muted>}
          {partsForOrder.map((s) => (
            <Card key={s.id} onPress={() => router.push({ pathname: "/shop/shipment/[id]", params: { id: s.id } })}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>{s.description || s.supplier || "Shipment"}</Text>
                <ShipmentBadge status={s.status} />
              </Row>
              <Muted style={{ marginTop: 2 }}>{[s.supplier, s.eta ? `ETA ${shortDate(s.eta)}` : null, s.receivedAt ? `in ${shortDate(s.receivedAt)}` : null].filter(Boolean).join(" · ")}</Muted>
            </Card>
          ))}
          <Button title="Order a part" tone="secondary" onPress={() => router.push({ pathname: "/shop/shipment/[id]", params: { id: "new", wo: order.id } })} />
          <Button title="Delete work order" tone="ghost" style={{ marginTop: space.lg }} onPress={onDelete} />
        </>
      )}
    </Screen>
  );
}
