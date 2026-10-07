import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * The typed Supabase client every shared data function takes as its first argument.
 * Each app builds its own (browser storage on the web, SecureStore on iOS) and passes it in;
 * shared code never creates one, so it never touches env vars.
 */
export type Db = SupabaseClient<Database>;
