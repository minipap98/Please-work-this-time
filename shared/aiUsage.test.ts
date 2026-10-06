import { describe, expect, it } from "vitest";
import { AI_ALERT_USD_30D, estimateAiCost, quotaMessage, summarizeAiUsage, type AiUsageRow } from "./aiUsage";

const now = new Date("2026-10-06T12:00:00Z");
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();

function row(p: Partial<AiUsageRow> & { createdAt: string }): AiUsageRow {
  return { id: Math.random().toString(36).slice(2), userId: "u1", kind: "invoice", status: "ok", model: "claude-opus-5-5", inputTokens: 0, outputTokens: 0, costUsd: 0, note: null, ...p };
}

describe("estimateAiCost", () => {
  it("prices Opus 5.5 at list", () => {
    expect(estimateAiCost("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0 })).toBe(4);
    expect(estimateAiCost("claude-opus-5-5", { inputTokens: 5000, outputTokens: 1000, cacheReadTokens: 0 })).toBeCloseTo(0.04, 6);
  });
  it("treats an unknown model like Opus so it never under-counts", () => {
    expect(estimateAiCost("claude-whatever", { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0 })).toBe(20);
  });
});

describe("summarizeAiUsage", () => {
  it("separates today from the month and ignores anything older than 30 days", () => {
    const s = summarizeAiUsage(
      [
        row({ createdAt: at(1), costUsd: 0.1 }),
        row({ createdAt: at(30), costUsd: 0.2 }),
        row({ createdAt: at(24 * 31), costUsd: 9 }),
      ],
      now,
    );
    expect(s.today).toEqual({ calls: 1, cost: 0.1, denied: 0 });
    expect(s.month.calls).toBe(2);
    expect(s.month.cost).toBeCloseTo(0.3, 6);
  });

  it("counts denied rows without charging for them", () => {
    const s = summarizeAiUsage([row({ createdAt: at(2), status: "denied" }), row({ createdAt: at(2), costUsd: 0.05 })], now);
    expect(s.today).toEqual({ calls: 1, cost: 0.05, denied: 1 });
    expect(s.spenders[0]).toMatchObject({ userId: "u1", callsToday: 1, deniedToday: 1, flagged: true });
  });

  it("flags heavy spenders and sorts them first", () => {
    const s = summarizeAiUsage(
      [
        row({ createdAt: at(5), userId: "quiet", costUsd: 0.1 }),
        row({ createdAt: at(100), userId: "heavy", costUsd: AI_ALERT_USD_30D }),
        row({ createdAt: at(5), userId: "cheap", status: "cached" }),
      ],
      now,
    );
    expect(s.spenders.map((p) => p.userId)).toEqual(["heavy", "quiet", "cheap"]);
    expect(s.spenders[0].flagged).toBe(true);
    expect(s.spenders[2]).toMatchObject({ cached30d: 1, flagged: false });
    expect(s.month.cached).toBe(1);
  });

  it("rolls up by kind in a fixed order", () => {
    const s = summarizeAiUsage([row({ createdAt: at(1), kind: "intervals", costUsd: 0.2 }), row({ createdAt: at(1), kind: "invoice", costUsd: 0.1 })], now);
    expect(s.byKind.map((k) => k.kind)).toEqual(["invoice", "intervals"]);
  });
});

describe("quotaMessage", () => {
  it("names the limit that was hit", () => {
    expect(quotaMessage("invoice", { dayUsed: 20, dayLimit: 20, monthUsed: 40, monthLimit: 150 })).toMatch(/today's 20 invoice reads/);
    expect(quotaMessage("intervals", { dayUsed: 2, dayLimit: 5, monthUsed: 30, monthLimit: 30 })).toMatch(/month's 30 schedule lookups/);
  });
});
