import type { RequestHandler } from "express";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { normalizeInvoice, type ExtractedInvoice } from "../../../../packages/shared/src/invoice.js";
import { INVOICE_MODEL, parseJsonObject, readWithClaude, sourceFor, type Source } from "./invoice-extract.js";
import { cachedResult, consumeQuota, fileHash, recordUsage, usageOf } from "../lib/ai-usage.js";
import { handleInboundPartsEmail } from "./inbound-email.js";
import { inboundTokenFromAddress } from "../../../../packages/shared/src/shop.js";

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
 * Inbound mail for the whole domain. Point the provider's single webhook at
 * POST /api/inbound/receipts?secret=INBOUND_EMAIL_SECRET: parts+<token>@… is handed to the parts handler,
 * anything else is treated as a receipt. Owners forward invoices to receipts@INBOUND_EMAIL_DOMAIN; the
 * sender's address identifies the account. The first readable attachment (PDF/photo) is read with Claude; with no
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
  // One webhook for the whole inbound domain: parts+<token>@… is a shop's parts mail, everything else is a receipt.
  const to = [str(body.To), str(body.to), str(body.recipient), str(body.OriginalRecipient)].filter(Boolean).join(",");
  if (inboundTokenFromAddress(to)) {
    handleInboundPartsEmail(req, res, () => undefined);
    return;
  }
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
  let readError: string | null = null;
  // Hash of what gets read: the attachment bytes, or the email text when there is none.
  let hash: string | null = null;
  const file = attachmentsOf(body).find((a) => READABLE.has(a.type) && a.data.length <= MAX_BYTES);
  if (file) {
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    attachmentPath = `${profile.id}/inbox/${row.id}.${ext}`;
    attachmentName = file.name;
    const { error: upErr } = await admin.storage.from("boat-documents").upload(attachmentPath, file.data, { contentType: file.type, upsert: true });
    if (upErr) attachmentPath = null;
    const made = sourceFor(file.data, file.type);
    if ("error" in made) readError = made.error;
    else {
      source = made.source;
      hash = fileHash(file.data);
    }
  } else if (text.length > 40) {
    const snippet = text.slice(0, 20000);
    source = { type: "text", text: `Forwarded email (subject: ${subject}):\n\n${snippet}` };
    hash = fileHash(Buffer.from(snippet));
  }

  let extracted: ExtractedInvoice | null = null;
  if (readError) {
    // The attachment was there but can't be read (too many pages); nothing to spend.
  } else if (!source) {
    readError = "No PDF, photo or readable text in the email.";
  } else if (!process.env.ANTHROPIC_API_KEY) {
    readError = "Receipt reading isn't set up on the server.";
  } else {
    // Every read runs inside the owner's receipt quota, so a flood of forwarded mail can't run up the bill.
    const quota = await consumeQuota(admin, profile.id, "receipt", hash);
    if (!quota.allowed) {
      readError = `${quota.message} This one wasn't read, so enter it by hand.`;
    } else {
      const earlier = hash ? await cachedResult<ExtractedInvoice>(admin, hash) : null;
      if (earlier) {
        extracted = normalizeInvoice(earlier);
        await recordUsage(admin, quota.usageId, { status: "cached", note: "same file as an earlier read" });
      } else {
        try {
          const msg = await readWithClaude(source);
          const usage = usageOf(msg);
          const out = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
          if (msg.stop_reason === "refusal" || !out) {
            readError = "Couldn't read this receipt.";
            await recordUsage(admin, quota.usageId, { status: "failed", model: msg.model, usage, note: msg.stop_reason ?? "no text" });
          } else {
            extracted = normalizeInvoice(parseJsonObject(out));
            await recordUsage(admin, quota.usageId, { status: "ok", model: msg.model, usage, result: extracted });
          }
        } catch (e) {
          readError = e instanceof Error ? e.message : "Couldn't read this receipt.";
          await recordUsage(admin, quota.usageId, { status: "failed", model: INVOICE_MODEL, note: readError });
        }
      }
    }
  }

  await admin
    .from("receipt_inbox")
    .update({ attachment_path: attachmentPath, attachment_name: attachmentName, extracted, read_error: readError })
    .eq("id", row.id);

  res.json({ ok: true, routed: true, id: row.id, read: !!extracted });
};
