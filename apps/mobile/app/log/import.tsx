// Import an invoice: snap or pick it, the server reads it, the owner checks the details and
// it goes into the Boat Log with the file attached. An emailed receipt skips the first step.
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { invoiceToLogEntry } from "@bosun/shared/boatLog/invoiceRead";
import { LOG_CATEGORIES } from "@bosun/shared/boatLog/records";
import { pickReceiptBoat } from "@bosun/shared/boatLog/receipts";
import { boatLabel, boatTitle } from "@bosun/shared/boats/boats";
import { invoiceCheck, type ExtractedInvoice } from "@bosun/shared/invoice";
import { useAddLogEntry, useReadInvoice, useReceiptInbox, useResolveReceipt } from "@/lib/boatLog";
import { useMyBoats } from "@/lib/boats";
import { pickInvoicePdf, pickInvoicePhoto, type PickedFile } from "@/lib/files";
import { colors, radius, space } from "@/lib/theme";
import { Button, Card, Chip, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";
import { DateField, Select, isIsoDate, money, todayIso } from "@/ui/pickers";

type Read = { invoice: ExtractedInvoice | null; path: string | null; reason: string | null };

const num = (s: string): number | null => {
  const n = parseFloat(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export default function ImportInvoice() {
  const { boat: boatParam, receipt: receiptId } = useLocalSearchParams<{ boat?: string; receipt?: string }>();
  const router = useRouter();
  const { boats, active, isLoading } = useMyBoats();
  const { data: receipts } = useReceiptInbox();
  const receipt = receiptId ? receipts?.find((r) => r.id === receiptId) : undefined;
  const [boatId, setBoatId] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [readState, setReadState] = useState<Read | null>(null);
  const reader = useReadInvoice();
  const add = useAddLogEntry();
  const resolve = useResolveReceipt();
  const [error, setError] = useState<string | null>(null);

  if (isLoading || (receiptId && !receipts)) return <Loading />;
  const labelled = boats.map((b) => ({ ...b, label: boatLabel(b) }));
  const boat = boats.find((b) => b.id === (boatId ?? boatParam)) ?? (receipt ? pickReceiptBoat(receipt, labelled, active?.id) : null) ?? active;
  if (!boat) return <Screen><Muted>Add your boat first.</Muted></Screen>;

  // Emailed receipts arrive already read.
  const read: Read | null = readState ?? (receipt ? { invoice: receipt.extracted, path: receipt.attachmentPath, reason: receipt.readError } : null);

  async function pick(kind: "camera" | "library" | "file") {
    setError(null);
    try {
      const f = kind === "file" ? await pickInvoicePdf() : await pickInvoicePhoto(kind === "camera");
      if (f) setFile(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that file.");
    }
  }

  async function readIt() {
    if (!file) return;
    setError(null);
    try {
      const r = await reader.mutateAsync({ file, boatId: boat!.id });
      setReadState(r.status === "read" ? { invoice: r.invoice, path: r.path, reason: null } : { invoice: null, path: r.path, reason: r.reason });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload the invoice.");
    }
  }

  if (!read) {
    return (
      <Screen>
        <Title sub="A photo or PDF of a shop invoice. Bosun reads the shop, date, parts and total; you check it before it's saved.">Import an invoice</Title>
        {boats.length > 1 && (
          <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
            {[...boats].reverse().map((b) => (
              <Chip key={b.id} label={boatTitle(b)} selected={b.id === boat.id} onPress={() => setBoatId(b.id)} />
            ))}
          </Row>
        )}
        {file && (
          <Card>
            {file.isPdf ? <Text style={{ color: colors.text }}>PDF ready ({Math.round(file.bytes.byteLength / 1024)} KB)</Text> : <Image source={{ uri: file.uri }} style={{ width: "100%", aspectRatio: 0.8, borderRadius: radius.sm }} resizeMode="contain" />}
          </Card>
        )}
        <Row style={{ marginBottom: space.sm }}>
          <Button title="Take photo" tone="secondary" onPress={() => pick("camera")} style={{ flex: 1 }} />
          <Button title="Photo library" tone="secondary" onPress={() => pick("library")} style={{ flex: 1 }} />
        </Row>
        <Button title="Choose a PDF or file" tone="secondary" onPress={() => pick("file")} style={{ marginBottom: space.lg }} />
        <ErrorText>{error}</ErrorText>
        <Button title="Read invoice" onPress={readIt} disabled={!file} loading={reader.isPending} />
        {reader.isPending && <Muted style={{ marginTop: space.sm }}>Uploading and reading… this takes 10–30 seconds.</Muted>}
      </Screen>
    );
  }

  return <Review boatId={boat.id} boats={boats} onBoat={setBoatId} read={read} receiptId={receipt?.id} onSaved={() => router.back()} add={add} resolve={resolve} />;
}

function Review({ boatId, boats, onBoat, read, receiptId, onSaved, add, resolve }: { boatId: string; boats: ReturnType<typeof useMyBoats>["boats"]; onBoat: (id: string) => void; read: Read; receiptId?: string; onSaved: () => void; add: ReturnType<typeof useAddLogEntry>; resolve: ReturnType<typeof useResolveReceipt> }) {
  const inv = read.invoice;
  const [f, setF] = useState({
    title: inv?.title ?? "",
    date: inv?.date ?? todayIso(),
    category: inv?.category ?? "",
    shop: inv?.shop ?? "",
    invoiceNumber: inv?.invoiceNumber ?? "",
    total: inv?.total != null ? String(inv.total) : "",
    engineHours: inv?.engineHours != null ? String(inv.engineHours) : "",
    laborHours: inv?.laborHours != null ? String(inv.laborHours) : "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((c) => ({ ...c, ...patch }));
  const check = inv ? invoiceCheck({ ...inv, total: num(f.total) }) : null;
  const mismatch = check && check.difference != null && Math.abs(check.difference) > 1;

  async function save() {
    if (!f.title.trim()) return setError("Give the entry a title.");
    if (!isIsoDate(f.date)) return setError("Enter the date as YYYY-MM-DD.");
    setError(null);
    const base = inv ? invoiceToLogEntry({ ...inv, shop: f.shop.trim() || null, invoiceNumber: f.invoiceNumber.trim() || null, total: num(f.total), engineHours: num(f.engineHours), laborHours: num(f.laborHours), title: f.title.trim(), date: f.date, category: (f.category || null) as ExtractedInvoice["category"] }, boatId, read.path, f.notes) : null;
    const entry = base ?? {
      boatId,
      title: f.title.trim(),
      category: (f.category || null) as ExtractedInvoice["category"],
      date: f.date,
      engineHours: num(f.engineHours),
      cost: num(f.total),
      vendorName: f.shop.trim() || null,
      notes: [f.notes.trim(), f.invoiceNumber.trim() ? `Invoice #${f.invoiceNumber.trim()}` : null].filter(Boolean).join("\n") || null,
      laborHours: num(f.laborHours),
      invoicePath: read.path,
      invoiceNumber: f.invoiceNumber.trim() || null,
    };
    try {
      await add.mutateAsync(entry);
      if (receiptId) await resolve.mutateAsync({ id: receiptId, status: "added" });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the entry.");
    }
  }

  return (
    <Screen>
      <Title sub={inv ? "Check what was read before it goes in the Boat Log." : read.reason ?? undefined}>{inv ? "Looks right?" : "Fill it in"}</Title>
      {boats.length > 1 && (
        <Row style={{ marginBottom: space.md, flexWrap: "wrap" }}>
          {[...boats].reverse().map((b) => (
            <Chip key={b.id} label={boatTitle(b)} selected={b.id === boatId} onPress={() => onBoat(b.id)} />
          ))}
        </Row>
      )}
      <Field label="What was done" value={f.title} onChangeText={(v) => set({ title: v })} />
      <DateField label="Date" value={f.date} onChange={(v) => set({ date: v })} />
      <Select label="Category" value={f.category} options={LOG_CATEGORIES} placeholder="Optional" onChange={(v) => set({ category: v })} />
      <Field label="Shop" value={f.shop} onChangeText={(v) => set({ shop: v })} autoCapitalize="words" />
      <Field label="Invoice #" value={f.invoiceNumber} onChangeText={(v) => set({ invoiceNumber: v })} />
      <Field label="Total paid ($)" value={f.total} onChangeText={(v) => set({ total: v })} keyboardType="decimal-pad" hint={mismatch ? `The lines plus tax add up to ${money(check!.computed)}; check the total.` : undefined} />
      <Field label="Engine hours at the time" value={f.engineHours} onChangeText={(v) => set({ engineHours: v })} keyboardType="decimal-pad" placeholder="Optional" />
      <Field label="Labor hours" value={f.laborHours} onChangeText={(v) => set({ laborHours: v })} keyboardType="decimal-pad" placeholder="Optional" />
      {inv && inv.lines.length > 0 && (
        <Card>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: space.sm }}>{inv.lines.length} line item{inv.lines.length === 1 ? "" : "s"} read</Text>
          {inv.lines.slice(0, 12).map((l, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm, paddingVertical: 3 }}>
              <Text style={{ flex: 1, color: colors.text, fontSize: 13 }} numberOfLines={1}>{l.quantity !== 1 ? `${l.quantity} × ` : ""}{l.description}</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>{money(l.amount)}</Text>
            </View>
          ))}
          {inv.lines.length > 12 && <Muted>…and {inv.lines.length - 12} more</Muted>}
          {inv.tax != null && <Muted style={{ marginTop: 4 }}>Tax {money(inv.tax)}</Muted>}
        </Card>
      )}
      <Field label="Notes" value={f.notes} onChangeText={(v) => set({ notes: v })} multiline placeholder="Optional" />
      <ErrorText>{error}</ErrorText>
      <Button title="Add to Boat Log" onPress={save} loading={add.isPending || resolve.isPending} />
      {!!read.path && <Muted style={{ marginTop: space.sm }}>The invoice file stays attached to the entry, private to you.</Muted>}
    </Screen>
  );
}
