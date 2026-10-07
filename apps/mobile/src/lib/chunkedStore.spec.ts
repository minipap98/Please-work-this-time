import { describe, expect, it } from "vitest";
import { CHUNK_SIZE, chunkedStore, type KeyValueStore } from "./chunkedStore";

function memory(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    async get(k) { return map.get(k) ?? null; },
    async set(k, v) { map.set(k, v); },
    async remove(k) { map.delete(k); },
  };
}

describe("chunkedStore", () => {
  it("round-trips values larger than one chunk", async () => {
    const raw = memory();
    const store = chunkedStore(raw);
    const big = "x".repeat(CHUNK_SIZE * 2 + 17);
    await store.set("session", big);
    expect(raw.map.get("session.n")).toBe("3");
    expect(await store.get("session")).toBe(big);
  });

  it("drops stale chunks when a shorter value replaces a longer one", async () => {
    const raw = memory();
    const store = chunkedStore(raw);
    await store.set("k", "y".repeat(CHUNK_SIZE * 3));
    await store.set("k", "short");
    expect(await store.get("k")).toBe("short");
    expect(raw.map.has("k.1")).toBe(false);
    await store.remove("k");
    expect(raw.map.size).toBe(0);
    expect(await store.get("k")).toBeNull();
  });
});
