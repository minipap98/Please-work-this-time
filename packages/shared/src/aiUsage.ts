// AI usage: what each Claude call costs, per-account limits, and the admin roll-up.
// Rows live in public.ai_usage (migration 20261021); the server writes them, admins read them.

export const AI_KINDS = ["invoice", "receipt", "intervals", "outreach"] as const;
export type AiKind = (typeof AI_KINDS)[number];

export const AI_KIND_LABELS: Record<AiKind, string> = {
  invoice: "Invoice import",
  receipt: "Emailed receipt",
  intervals: "Service schedule",
  outreach: "Outreach draft",
};

export type AiStatus = "pending" | "ok" | "failed" | "cached" | "denied";

/** Anthropic list prices in USD per million tokens. Update when the model in the server routes changes. */
export const AI_PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1 },
};

export interface AiTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

/** Estimated cost of one call in USD. Unknown models are priced like Opus so we never under-count. */
export function estimateAiCost(model: string, u: AiTokenUsage): number {
  const p = AI_PRICES[model] ?? AI_PRICES["claude-opus-5-5"];
  const cost = (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/** One ai_usage row as the admin endpoint returns it. */
export interface AiUsageRow {
  id: string;
  userId: string | null;
  kind: AiKind;
  status: AiStatus;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  note: string | null;
  createdAt: string;
}

export interface AiLimit {
  kind: AiKind;
  perDay: number;
  perMonth: number;
}

export interface AiSpender {
  userId: string;
  calls30d: number;
  cost30d: number;
  callsToday: number;
  costToday: number;
  deniedToday: number;
  cached30d: number;
  lastAt: string;
  /** Over the alert line: denied today, or spend past AI_ALERT_USD_30D in 30 days. */
  flagged: boolean;
}

export interface AiUsageSummary {
  today: { calls: number; cost: number; denied: number };
  month: { calls: number; cost: number; denied: number; cached: number };
  byKind: { kind: AiKind; calls30d: number; cost30d: number }[];
  spenders: AiSpender[];
}

/** An account past this much Claude spend in 30 days shows up flagged on the admin tab. */
export const AI_ALERT_USD_30D = 5;

const DAY_MS = 86_400_000;

/** Roll 30 days of rows into totals and a per-account leaderboard. Denied rows cost nothing but are counted. */
export function summarizeAiUsage(rows: AiUsageRow[], now = new Date()): AiUsageSummary {
  const dayAgo = now.getTime() - DAY_MS;
  const monthAgo = now.getTime() - 30 * DAY_MS;
  const today = { calls: 0, cost: 0, denied: 0 };
  const month = { calls: 0, cost: 0, denied: 0, cached: 0 };
  const kinds = new Map<AiKind, { calls30d: number; cost30d: number }>();
  const people = new Map<string, AiSpender>();

  for (const r of rows) {
    const t = Date.parse(r.createdAt);
    if (Number.isNaN(t) || t < monthAgo) continue;
    const denied = r.status === "denied";
    const isToday = t >= dayAgo;
    if (denied) {
      month.denied += 1;
      if (isToday) today.denied += 1;
    } else {
      month.calls += 1;
      month.cost += r.costUsd;
      if (r.status === "cached") month.cached += 1;
      if (isToday) {
        today.calls += 1;
        today.cost += r.costUsd;
      }
      const k = kinds.get(r.kind) ?? { calls30d: 0, cost30d: 0 };
      k.calls30d += 1;
      k.cost30d += r.costUsd;
      kinds.set(r.kind, k);
    }
    if (!r.userId) continue;
    const p = people.get(r.userId) ?? { userId: r.userId, calls30d: 0, cost30d: 0, callsToday: 0, costToday: 0, deniedToday: 0, cached30d: 0, lastAt: r.createdAt, flagged: false };
    if (denied) {
      if (isToday) p.deniedToday += 1;
    } else {
      p.calls30d += 1;
      p.cost30d += r.costUsd;
      if (r.status === "cached") p.cached30d += 1;
      if (isToday) {
        p.callsToday += 1;
        p.costToday += r.costUsd;
      }
    }
    if (r.createdAt > p.lastAt) p.lastAt = r.createdAt;
    people.set(r.userId, p);
  }

  const spenders = [...people.values()]
    .map((p) => ({ ...p, flagged: p.deniedToday > 0 || p.cost30d >= AI_ALERT_USD_30D }))
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.cost30d - a.cost30d || b.calls30d - a.calls30d);

  return {
    today,
    month,
    byKind: AI_KINDS.filter((k) => kinds.has(k)).map((k) => ({ kind: k, ...kinds.get(k)! })),
    spenders,
  };
}

/** The message an owner sees when they've hit a limit. */
export function quotaMessage(kind: AiKind, q: { dayUsed: number; dayLimit: number; monthUsed: number; monthLimit: number }): string {
  const what = kind === "intervals" ? "schedule lookups" : kind === "outreach" ? "outreach drafts" : "invoice reads";
  if (q.monthUsed >= q.monthLimit) return `You've used this month's ${q.monthLimit} ${what}. The limit resets over the next 30 days.`;
  return `You've used today's ${q.dayLimit} ${what}. Try again tomorrow.`;
}
