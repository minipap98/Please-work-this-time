import { createApiClient } from "@shared/api/client";
import { supabase, supabaseMissing } from "@/lib/supabase";

/** The Express API on this origin, called with the signed-in user's token. */
export const api = createApiClient({
  baseUrl: "",
  getToken: async () => {
    if (supabaseMissing) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});
