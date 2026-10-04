import type { RequestHandler } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { PLAN_SCHEMA, normalizePlan, planPrompt, type EngineRequest } from "../../shared/servicePlan.js";

function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("No JSON in the reply.");
  }
}

async function askClaude(prompt: string) {
  const client = new Anthropic();
  const base = {
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user" as const, content: prompt }],
  };
  try {
    return await client.beta.messages.create({ ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  } catch (e) {
    if (!(e instanceof Anthropic.BadRequestError)) throw e;
    if (/fallback/i.test(e.message)) return await client.beta.messages.create(base);
    if (/output_config|schema/i.test(e.message)) {
      return await client.beta.messages.create({
        model: base.model,
        max_tokens: base.max_tokens,
        output_config: { effort: "low" },
        messages: [{
          role: "user",
          content: `${prompt}\n\nReply with only a JSON object (no prose, no code fences) matching this JSON schema:\n${JSON.stringify(PLAN_SCHEMA)}`,
        }],
      });
    }
    throw e;
  }
}

/**
 * POST /api/maintenance/intervals { engineMake, engineModel, engineType, engineCount, boatYear?, boatMake?, boatModel? }
 * Returns a suggested maintenance schedule for the engine. Nothing is saved here;
 * the owner reviews it and saves from the app.
 */
export const handleServiceIntervals: RequestHandler = async (req, res) => {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!url || !anon || !token) {
      res.status(401).json({ error: "Sign in to get service intervals." });
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({ error: "Service interval lookup isn't set up yet.", code: "not_configured" });
      return;
    }
    const { data: userData, error: userError } = await createClient(url, anon).auth.getUser(token);
    if (userError || !userData.user) {
      res.status(401).json({ error: "Sign in to get service intervals." });
      return;
    }

    const b = (req.body ?? {}) as Record<string, unknown>;
    const s = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const engine: EngineRequest = {
      engineMake: s(b.engineMake),
      engineModel: s(b.engineModel),
      engineType: s(b.engineType) || null,
      engineCount: Math.min(6, Math.max(1, Math.round(Number(b.engineCount) || 1))),
      boatYear: s(b.boatYear, 8) || null,
      boatMake: s(b.boatMake) || null,
      boatModel: s(b.boatModel) || null,
    };
    if (!engine.engineMake || !engine.engineModel) {
      res.status(400).json({ error: "Add your engine make and model in My Boats first." });
      return;
    }

    const msg = await askClaude(planPrompt(engine));
    if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") {
      res.status(422).json({ error: "We couldn't build a schedule for that engine. Add items by hand instead." });
      return;
    }
    const text = msg.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === "text")?.text;
    const tasks = text ? normalizePlan(parseJsonObject(text)) : [];
    if (tasks.length === 0) {
      res.status(502).json({ error: "We couldn't build a schedule for that engine. Add items by hand instead." });
      return;
    }
    res.json({ tasks });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "Busy right now. Try again in a minute." });
    } else if (e instanceof Anthropic.AuthenticationError) {
      res.status(502).json({ error: "The schedule lookup isn't set up correctly (API key rejected).", code: "bad_key" });
    } else if (e instanceof Anthropic.APIError) {
      console.error("service intervals", e.status, e.message);
      res.status(502).json({ error: `Schedule lookup failed (${e.status ?? "error"}): ${e.message.slice(0, 200)}` });
    } else {
      console.error("service intervals", e);
      res.status(500).json({ error: `Something went wrong: ${String(e).slice(0, 200)}` });
    }
  }
};
