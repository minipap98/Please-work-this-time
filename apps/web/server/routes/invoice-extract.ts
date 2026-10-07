import type { RequestHandler } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { INVOICE_PROMPT, INVOICE_SCHEMA, normalizeInvoice, type ExtractedInvoice } from "../../../../packages/shared/src/invoice.js";
import { cachedResult, consumeQuota, fileHash, recordUsage, serviceDb, usageOf } from "../lib/ai-usage.js";
import { countPdfPages } from "../lib/pdf.js";

const MAX_BYTES = 15 * 1024 * 1024;
/** Real invoices are one to three pages; a long PDF costs a dollar or more per read. */
export const MAX_PDF_PAGES = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
export const INVOICE_MODEL = "claude-opus-5-5";

/**
 * POST /api/invoices/extract { path }
 * Reads an invoice the signed-in owner already uploaded to their own folder in
 * the private boat-documents bucket and returns the fields for review.
 * Nothing is saved here; the owner confirms on the review screen.
 */
export const handleInvoiceHealth: RequestHandler = (_req, res) => {
  res.json({ configured: !!process.env.ANTHROPIC_API_KEY && !!serviceDb(), supabase: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) });
};

export type Source = Anthropic.Beta.BetaContentBlockParam;

/** Structured output is plain JSON; the plain-JSON retry may wrap it in prose or fences. */
export function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("The reader didn't return JSON.");
  }
}

/** Turn a file into a Claude content block, or explain why it can't be read. Also caps PDF length. */
export function sourceFor(buf: Buffer, type: string): { source: Source } | { error: string; status: number } {
  if (type === "application/pdf") {
    const pages = countPdfPages(buf);
    if (pages != null && pages > MAX_PDF_PAGES) {
      return { status: 422, error: `That PDF has ${pages} pages. Invoices are usually one to three, so upload just the invoice pages (up to ${MAX_PDF_PAGES}).` };
    }
    return { source: { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } } };
  }
  if ((IMAGE_TYPES as readonly string[]).includes(type)) {
    return { source: { type: "image", source: { type: "base64", media_type: type as ImageType, data: buf.toString("base64") } } };
  }
  return { status: 415, error: "Upload a PDF or a photo (JPG or PNG)." };
}

export async function readWithClaude(source: Source) {
  const client = new Anthropic();
  const base = {
    model: INVOICE_MODEL,
    // The schema output is a few hundred tokens; this bounds a page of dense text plus brief thinking.
    max_tokens: 8000,
    output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: INVOICE_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user" as const, content: [source, { type: "text" as const, text: INVOICE_PROMPT }] }],
  };
  try {
    return await client.beta.messages.create({ ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  } catch (e) {
    if (!(e instanceof Anthropic.BadRequestError)) throw e;
    // A 400 is rejected before generation, so these retries don't add to the bill.
    // If the fallback beta isn't enabled for this key, read without it rather than failing.
    if (/fallback/i.test(e.message)) {
      console.warn("invoice extract: retrying without fallbacks:", e.message);
      return await client.beta.messages.create(base);
    }
    // If structured output rejects the schema, ask for plain JSON; normalizeInvoice validates it either way.
    if (/output_config|schema/i.test(e.message)) {
      console.warn("invoice extract: retrying without structured output:", e.message);
      return await client.beta.messages.create({
        model: base.model,
        max_tokens: base.max_tokens,
        output_config: { effort: "low" },
        messages: [{
          role: "user",
          content: [
            source,
            { type: "text", text: `${INVOICE_PROMPT}\n\nReply with only a JSON object (no prose, no code fences) matching this JSON schema:\n${JSON.stringify(INVOICE_SCHEMA)}` },
          ],
        }],
      });
    }
    throw e;
  }
}

export const handleExtractInvoice: RequestHandler = async (req, res, next) => {
  const started = Date.now();
  try {
    await extract(req, res, next);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "Invoice reading is busy. Try again in a minute." });
    } else if (e instanceof Anthropic.AuthenticationError) {
      console.error("invoice extract: bad ANTHROPIC_API_KEY");
      res.status(502).json({ error: "Invoice reading isn't set up correctly (the API key was rejected).", code: "bad_key" });
    } else if (e instanceof Anthropic.APIError) {
      console.error("invoice extract", e.status, e.message);
      res.status(502).json({ error: `Invoice reading failed (${e.status ?? "error"}): ${e.message.slice(0, 200)}` });
    } else {
      console.error("invoice extract", e);
      res.status(500).json({ error: `Something went wrong reading that invoice: ${String(e).slice(0, 200)}` });
    }
  } finally {
    console.log(`invoice extract finished in ${Date.now() - started}ms`);
  }
};

const extract: RequestHandler = async (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!url || !anon || !token) {
    res.status(401).json({ error: "Sign in to import invoices." });
    return;
  }
  const admin = serviceDb();
  if (!process.env.ANTHROPIC_API_KEY || !admin) {
    // No service role means no usage tracking, and reading without a quota is off by design.
    res.status(503).json({ error: "Invoice reading isn't set up yet.", code: "not_configured" });
    return;
  }

  const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Sign in to import invoices." });
    return;
  }

  const path = String(req.body?.path ?? "");
  if (!path.startsWith(`${userData.user.id}/`) || path.includes("..")) {
    res.status(403).json({ error: "That file isn't yours." });
    return;
  }

  // Storage RLS only lets the owner read their own folder, so this download is scoped to them.
  const { data: file, error: dlError } = await supabase.storage.from("boat-documents").download(path);
  if (dlError || !file) {
    res.status(404).json({ error: "Couldn't find that upload." });
    return;
  }
  if (file.size > MAX_BYTES) {
    res.status(413).json({ error: "That file is over 15 MB. Try a smaller scan or a photo." });
    return;
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = file.type || (path.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
  const made = sourceFor(buf, type);
  if ("error" in made) {
    res.status(made.status).json({ error: made.error });
    return;
  }

  // Everything below costs money, so it runs inside the account's quota.
  const hash = fileHash(buf);
  const quota = await consumeQuota(admin, userData.user.id, "invoice", hash);
  if (!quota.allowed) {
    res.status(429).json({ error: quota.message, code: "quota" });
    return;
  }

  const earlier = await cachedResult<ExtractedInvoice>(admin, hash);
  if (earlier) {
    await recordUsage(admin, quota.usageId, { status: "cached", note: "same file as an earlier read" });
    res.json({ invoice: normalizeInvoice(earlier), cached: true });
    return;
  }

  let msg: Awaited<ReturnType<typeof readWithClaude>>;
  try {
    msg = await readWithClaude(made.source);
  } catch (e) {
    await recordUsage(admin, quota.usageId, { status: "failed", model: INVOICE_MODEL, note: e instanceof Error ? e.message : String(e) });
    throw e;
  }
  const usage = usageOf(msg);

  if (msg.stop_reason === "refusal") {
    await recordUsage(admin, quota.usageId, { status: "failed", model: msg.model, usage, note: "refusal" });
    res.status(422).json({ error: "We couldn't read that file. Enter the details by hand." });
    return;
  }
  if (msg.stop_reason === "max_tokens") {
    await recordUsage(admin, quota.usageId, { status: "failed", model: msg.model, usage, note: "max_tokens" });
    res.status(422).json({ error: "That invoice is too long to read in one go. Enter the details by hand." });
    return;
  }
  const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  if (!text) {
    await recordUsage(admin, quota.usageId, { status: "failed", model: msg.model, usage, note: "no text in reply" });
    res.status(502).json({ error: "We couldn't read that file. Enter the details by hand." });
    return;
  }
  const invoice = normalizeInvoice(parseJsonObject(text));
  await recordUsage(admin, quota.usageId, { status: "ok", model: msg.model, usage, result: invoice });
  res.json({ invoice });
};
