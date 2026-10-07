import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabaseMissing = !supabaseUrl || !supabaseAnonKey;

export const supabase = supabaseMissing
  ? (null as unknown as ReturnType<typeof createClient<Database>>)
  : createClient<Database>(supabaseUrl, supabaseAnonKey);
