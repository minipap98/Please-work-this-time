import type { RequestHandler } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { INVOICE_PROMPT, INVOICE_SCHEMA, normalizeInvoice } from "../../shared/invoice.js";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

/**
 * POST /api/invoices/extract { path }
 * Reads an invoice the signed-in owner already uploaded to their own folder in
 * the private boat-documents bucket and returns the fields for review.
 * Nothing is saved here; the owner confirms on the review screen.
 */
export const handleInvoiceHealth: RequestHandler = (_req, res) => {
  res.json({ configured: !!process.env.ANTHROPIC_API_KEY, supabase: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) });
};

type Source = Anthropic.Beta.BetaContentBlockParam;

async function readWithClaude(source: Source) {
  const client = new Anthropic();
  const base = {
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: INVOICE_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user" as const, content: [source, { type: "text" as const, text: INVOICE_PROMPT }] }],
  };
  try {
    return await client.beta.messages.create({ ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  } catch (e) {
    // If the fallback beta isn't enabled for this key, read without it rather than failing.
    if (e instanceof Anthropic.BadRequestError && /fallback/i.test(e.message)) {
      console.warn("invoice extract: retrying without fallbacks:", e.message);
      return await client.beta.messages.create(base);
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
  if (!process.env.ANTHROPIC_API_KEY) {
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

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const type = file.type || (path.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
  let source: Source;
  if (type === "application/pdf") {
    source = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  } else if ((IMAGE_TYPES as readonly string[]).includes(type)) {
    source = { type: "image", source: { type: "base64", media_type: type as ImageType, data } };
  } else {
    res.status(415).json({ error: "Upload a PDF or a photo (JPG or PNG)." });
    return;
  }

  {
    const msg = await readWithClaude(source);

    if (msg.stop_reason === "refusal") {
      res.status(422).json({ error: "We couldn't read that file. Enter the details by hand." });
      return;
    }
    if (msg.stop_reason === "max_tokens") {
      res.status(422).json({ error: "That invoice is too long to read in one go. Enter the details by hand." });
      return;
    }
    const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!text) {
      res.status(502).json({ error: "We couldn't read that file. Enter the details by hand." });
      return;
    }
    res.json({ invoice: normalizeInvoice(JSON.parse(text)) });
  }
};
