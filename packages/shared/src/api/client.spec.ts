import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("createApiClient", () => {
  it("prefixes the base URL and sends the bearer token", async () => {
    const f = fakeFetch(200, { matched: 2, emailed: 1 });
    const api = createApiClient({ baseUrl: "https://getbosun.app", getToken: async () => "tok", fetch: f });
    const res = await api.notifyJob("p1");
    expect(res.ok).toBe(true);
    expect(res.body).toEqual({ matched: 2, emailed: 1 });
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://getbosun.app/api/jobs/notify");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(init.body).toBe(JSON.stringify({ projectId: "p1" }));
  });

  it("omits the auth header when signed out and reports HTTP errors without throwing", async () => {
    const f = fakeFetch(503, { error: "Payments are not configured yet." });
    const api = createApiClient({ baseUrl: "", getToken: async () => null, fetch: f });
    const res = await api.createPaymentIntent({ amountDollars: 10, projectId: "p", bidId: "b" });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Payments are not configured yet.");
    const [, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("tolerates a non-JSON body", async () => {
    const f = vi.fn(async () => ({ ok: false, status: 500, json: async () => { throw new Error("nope"); } })) as unknown as typeof fetch;
    const api = createApiClient({ baseUrl: "", getToken: async () => null, fetch: f });
    const res = await api.get("/api/health");
    expect(res.body).toEqual({});
  });
});
