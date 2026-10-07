import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse } from "../api";

/**
 * Calls to the Bosun Express API (`/api/*`) with the signed-in user's Supabase token.
 * The web passes an empty base URL (same origin); the mobile app passes https://getbosun.app.
 */
export interface ApiClientOptions {
  /** "" on the web (same origin); the site origin on mobile. No trailing slash. */
  baseUrl: string;
  /** The current Supabase access token, or null when signed out. */
  getToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  /** The parsed JSON body, or {} when the body wasn't JSON. */
  body: T & { error?: string; code?: string };
}

export interface ApiClient {
  /** Raw JSON POST with the auth header. Never throws on HTTP errors; read `ok`/`status`. */
  post<T>(path: string, body: unknown): Promise<ApiResult<T>>;
  get<T>(path: string): Promise<ApiResult<T>>;
  /** Email the shops that match a newly posted job. */
  notifyJob(projectId: string): Promise<ApiResult<{ matched: number; emailed: number }>>;
  createPaymentIntent(input: CreatePaymentIntentRequest): Promise<ApiResult<CreatePaymentIntentResponse>>;
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const doFetch = opts.fetch ?? fetch;

  async function send<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResult<T>> {
    const token = await opts.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await doFetch(`${opts.baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const parsed = (await res.json().catch(() => ({}))) as ApiResult<T>["body"];
    return { ok: res.ok, status: res.status, body: parsed };
  }

  return {
    post: (path, body) => send("POST", path, body),
    get: (path) => send("GET", path),
    notifyJob: (projectId) => send("POST", "/api/jobs/notify", { projectId }),
    createPaymentIntent: (input) => send("POST", "/api/payments/create-intent", input),
  };
}
