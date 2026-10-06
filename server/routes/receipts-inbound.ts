import type { RequestHandler } from "express";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { normalizeInvoice, type ExtractedInvoice } from "../../shared/invoice.js";
import { parseJsonObject, readWithClaude, type Source } from "./invoice-extract.js";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** "John Pappas <jp@x.com>" → "jp@x.com" */
function emailOf(v: string): string {
  const m = v.match(/<([^>]+)>/);
  return (m ? m[1] : v).trim().toLowerCase();
}

interface Attachment {
  name: string;
  type: string;
  data: Buffer;
}

/** Postmark (Attachments[{Name,Content,ContentType}]) or a generic attachments[{filename,content,contentType}] shape, base64 either way. */
function attachmentsOf(body: Record<string, unknown>): Attachment[] {
  const raw = (body.Attachments ?? body.attachments ?? []) as Record<string, unknown>[];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => ({
      name: str(a.Name) || str(a.filename) || str(a.name) || "attachment",
      type: (str(a.ContentType) || str(a.contentType) || str(a.type)).toLowerCase().split(";")[0],
      data: Buffer.from(str(a.Content) || str(a.content) || str(a.data), "base64"),
    }))
    .filter((a) => a.data.length > 0);
}

const READABLE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Inbound receipts. Owners forward invoices to receipts@INBOUND_EMAIL_DOMAIN; the sender's address
 * identifies the account. Point the mail provider at POST /api/inbound/receipts?secret=INBOUND_EMAIL_SECRET
 * (same secret as parts). The first readable attachment (PDF/photo) is read with Claude; with no
 * attachment, the email text is read instead. Nothing goes in the Boat Log until the owner reviews it.
 */
export const handleInboundReceipt: RequestHandler = async (req, res) => {
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
  const from = emailOf(str(body.From) || str(body.from) || str(body.sender));
  const subject = (str(body.Subject) || str(body.subject)).slice(0, 300);
  const messageId = str(body.MessageID) || str(body["Message-Id"]) || str(body.messageId) || null;
  const text = (str(body.TextBody) || str(body.text) || str(body["body-plain"]) || (str(body.HtmlBody) || str(body.html)).replace(/<[^>]+>/g, " ")).trim();
  if (!from) {
    res.json({ ok: true, routed: false, reason: "no sender" });
    return;
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  // The sender must be a Bosun owner. Unknown senders are dropped (200 so the provider doesn't retry).
  const { data: profile } = await admin.from("profiles").select("id, role").ilike("email", from).maybeSingle();
  if (!profile) {
    res.json({ ok: true, routed: false, reason: "unknown sender" });
    return;
  }
  if (messageId) {
    const { data: dupe } = await admin.from("receipt_inbox").select("id").eq("owner_id", profile.id).eq("message_id", messageId).maybeSingle();
    if (dupe) {
      res.json({ ok: true, routed: true, duplicate: true });
      return;
    }
  }

  const { data: row, error: insErr } = await admin
    .from("receipt_inbox")
    .insert({ owner_id: profile.id, from_email: from, subject, message_id: messageId })
    .select("id")
    .single();
  if (insErr) {
    res.status(500).json({ error: insErr.message });
    return;
  }

  // Keep the first readable attachment in the owner's own folder, like a manual invoice import.
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  let source: Source | null = null;
  const file = attachmentsOf(body).find((a) => READABLE.has(a.type) && a.data.length <= MAX_BYTES);
  if (file) {
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    attachmentPath = `${profile.id}/inbox/${row.id}.${ext}`;
    attachmentName = file.name;
    const { error: upErr } = await admin.storage.from("boat-documents").upload(attachmentPath, file.data, { contentType: file.type, upsert: true });
    if (upErr) attachmentPath = null;
    const data = file.data.toString("base64");
    source =
      file.type === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
        : { type: "image", source: { type: "base64", media_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data } };
  } else if (text.length > 40) {
    source = { type: "text", text: `Forwarded email (subject: ${subject}):\n\n${text.slice(0, 20000)}` };
  }

  let extracted: ExtractedInvoice | null = null;
  let readError: string | null = null;
  if (!source) {
    readError = "No PDF, photo or readable text in the email.";
  } else if (!process.env.ANTHROPIC_API_KEY) {
    readError = "Receipt reading isn't set up on the server.";
  } else {
    try {
      const msg = await readWithClaude(source);
      const out = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
      if (msg.stop_reason === "refusal" || !out) readError = "Couldn't read this receipt.";
      else extracted = normalizeInvoice(parseJsonObject(out));
    } catch (e) {
      readError = e instanceof Error ? e.message : "Couldn't read this receipt.";
    }
  }

  await admin
    .from("receipt_inbox")
    .update({ attachment_path: attachmentPath, attachment_name: attachmentName, extracted, read_error: readError })
    .eq("id", row.id);

  res.json({ ok: true, routed: true, id: row.id, read: !!extracted });
};
