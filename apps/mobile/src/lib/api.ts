import { createApiClient } from "@bosun/shared/api/client";
import { API_URL } from "./env";
import { supabase } from "./supabase";

/** The Bosun API on getbosun.app, called with the signed-in user's token. */
export const api = createApiClient({
  baseUrl: API_URL,
  getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});
