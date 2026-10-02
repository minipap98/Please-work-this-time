import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import {
  advanceStatus,
  inboundTokenFromAddress,
  matchWorkOrderRef,
  parseShippingEmail,
  type ShipmentStatus,
  type WorkOrderStatus,
} from "../../shared/shop";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Inbound parts email. Point an inbound-mail provider (Postmark, SendGrid
 * Inbound Parse with JSON, Mailgun routes, Cloudflare Email Workers…) at
 * POST /api/inbound/parts-email?secret=INBOUND_EMAIL_SECRET.
 *
 * Shops set a Gmail/Outlook filter that forwards supplier + carrier emails to
 * parts+<token>@INBOUND_EMAIL_DOMAIN. Tracking numbers are upserted into
 * shop_parts_shipments and status only moves forward.
 */
export const handleInboundPartsEmail: RequestHandler = async (req, res) => {
  const expected = process.env.INBOUND_EMAIL_SECRET;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected || !url || !service) {
    res.status(503).json({ error: "Inbound email is not configured." });
    return;
  }
  const provided = str(req.query.secret) || str(req.headers["x-bosun-inbound-secret"]);
  if (!provided || !safeEqual(provided, expected)) {
    res.status(401).json({ error: "Bad secret." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  // Postmark: To/From/Subject/TextBody · SendGrid/Mailgun: to/from/subject/text|body-plain
  const to = [str(body.To), str(body.to), str(body.recipient), str(body.OriginalRecipient)]
    .filter(Boolean)
    .join(",");
  const from = str(body.From) || str(body.from) || str(body.sender);
  const subject = str(body.Subject) || str(body.subject);
  const text =
    str(body.TextBody) || str(body.text) || str(body["body-plain"]) ||
    (str(body.HtmlBody) || str(body.html)).replace(/<[^>]+>/g, " ");

  const token = inboundTokenFromAddress(to);
  if (!token) {
    // 200 so the provider doesn't retry mail we will never route.
    res.json({ ok: true, routed: false });
    return;
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: settings } = await admin
    .from("shop_settings")
    .select("vendor_id")
    .eq("inbound_email_token", token)
    .maybeSingle();
  if (!settings) {
    res.json({ ok: true, routed: false });
    return;
  }

  const parsed = parseShippingEmail(subject, text, from);
  if (parsed.shipments.length === 0) {
    res.json({ ok: true, routed: true, shipments: 0 });
    return;
  }

  // Pair the parts with a boat when the shop put its WO number on the order.
  let workOrderId: string | null = null;
  if (parsed.workOrderRef) {
    const { data: orders } = await admin
      .from("shop_work_orders")
      .select("id, number, status")
      .eq("vendor_id", settings.vendor_id)
      .ilike("number", `%${parsed.workOrderRef}`);
    workOrderId = matchWorkOrderRef(parsed.workOrderRef, (orders ?? []) as { id: string; number: string; status: WorkOrderStatus }[])?.id ?? null;
  }

  let upserted = 0;
  for (const s of parsed.shipments) {
    const { data: existing } = await admin
      .from("shop_parts_shipments")
      .select("id, status, eta, supplier, description, work_order_id")
      .eq("vendor_id", settings.vendor_id)
      .eq("tracking_number", s.trackingNumber)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("shop_parts_shipments")
        .update({
          status: advanceStatus(existing.status as ShipmentStatus, parsed.status),
          eta: parsed.eta ?? existing.eta,
          supplier: existing.supplier || parsed.supplier || "",
          work_order_id: existing.work_order_id ?? workOrderId,
          email_subject: subject.slice(0, 300),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (!error) upserted++;
    } else {
      const { error } = await admin.from("shop_parts_shipments").insert({
        vendor_id: settings.vendor_id,
        carrier: s.carrier,
        tracking_number: s.trackingNumber,
        status: parsed.status === "ordered" ? "shipped" : parsed.status,
        eta: parsed.eta,
        supplier: parsed.supplier ?? "",
        description: parsed.orderNumber ? `Order ${parsed.orderNumber}` : subject.slice(0, 120),
        source: "email",
        email_subject: subject.slice(0, 300),
        work_order_id: workOrderId,
      });
      if (!error) upserted++;
    }
  }

  res.json({ ok: true, routed: true, shipments: upserted, workOrderId });
};
