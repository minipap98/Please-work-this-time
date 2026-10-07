// Build-time public config. Expo inlines EXPO_PUBLIC_* at bundle time.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** The web app's origin; the API lives under /api there. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://getbosun.app").replace(/\/$/, "");
export const SITE_URL = API_URL;

export const supabaseMissing = !SUPABASE_URL || !SUPABASE_ANON_KEY;
