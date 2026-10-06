import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { estimateAiCost, quotaMessage, type AiKind, type AiTokenUsage } from "../../shared/aiUsage.js";

/**
 * Per-account guard around every Claude call. Each call reserves a row in ai_usage through
 * consume_ai_quota() (which says no once the account is over its daily or monthly limit), then
 * records what the call cost. Files are hashed so the same bytes are read once and reused.
 * Writes use the service role; without SUPABASE_SERVICE_ROLE_KEY the AI routes stay off.
 */

export function serviceDb(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

export function fileHash(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export interface Quota {
  allowed: boolean;
  usageId: string | null;
  dayUsed: number;
  dayLimit: number;
  monthUsed: number;
  monthLimit: number;
  /** What to tell the owner when allowed is false. */
  message: string;
}

export async function consumeQuota(db: SupabaseClient, userId: string, kind: AiKind, hash: string | null = null): Promise<Quota> {
  const { data, error } = await db.rpc("consume_ai_quota", { p_user: userId, p_kind: kind, p_file_hash: hash });
  if (error) throw new Error(`AI quota check failed: ${error.message}`);
  const r = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; usage_id: string | null; day_used: number; day_limit: number; month_used: number; month_limit: number } | undefined;
  if (!r) throw new Error("AI quota check returned nothing.");
  const q = { dayUsed: r.day_used, dayLimit: r.day_limit, monthUsed: r.month_used, monthLimit: r.month_limit };
  return { allowed: r.allowed, usageId: r.usage_id, ...q, message: quotaMessage(kind, q) };
}

/** A successful earlier read of the exact same file, by anyone. The bytes are identical, so the result is too. */
export async function cachedResult<T>(db: SupabaseClient, hash: string): Promise<T | null> {
  const { data } = await db
    .from("ai_usage")
    .select("result")
    .eq("file_hash", hash)
    .eq("status", "ok")
    .not("result", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.result as T | undefined) ?? null;
}

/** Token counts off a Messages API response; tolerant of the beta usage shape. */
export function usageOf(msg: { usage?: { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null } | null }): AiTokenUsage {
  return {
    inputTokens: msg.usage?.input_tokens ?? 0,
    outputTokens: msg.usage?.output_tokens ?? 0,
    cacheReadTokens: msg.usage?.cache_read_input_tokens ?? 0,
  };
}

export interface Outcome {
  status: "ok" | "failed" | "cached";
  model?: string;
  usage?: AiTokenUsage;
  /** Kept on ok rows only, so a repeat of the same file can be served from it. */
  result?: unknown;
  note?: string;
}

export async function recordUsage(db: SupabaseClient, usageId: string | null, o: Outcome): Promise<void> {
  if (!usageId) return;
  const usage = o.usage ?? { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  const { error } = await db
    .from("ai_usage")
    .update({
      status: o.status,
      model: o.model ?? null,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_read_tokens: usage.cacheReadTokens,
      cost_usd: o.model ? estimateAiCost(o.model, usage) : 0,
      result: o.status === "ok" ? (o.result ?? null) : null,
      note: o.note?.slice(0, 300) ?? null,
    })
    .eq("id", usageId);
  if (error) console.warn("ai usage: couldn't record", error.message);
}
