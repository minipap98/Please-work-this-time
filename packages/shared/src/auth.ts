// Sign-up / sign-in rules and the metadata shape the signup trigger reads. Same on every app.

import type { AppRole } from "./api";

export const MIN_PASSWORD_LENGTH = 6;

/** What's wrong with a sign-up form, or null when it can be sent. */
export function signupProblem(input: { name: string; password: string }): string | null {
  if (!input.name.trim()) return "Please enter your name.";
  if (input.password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

/**
 * Supabase signUp options. `handle_new_user` in the database reads `name` and `role` from this
 * metadata to create the profile row, so every app must send exactly these keys.
 */
export function signUpOptions(name: string, role: AppRole, emailRedirectTo?: string) {
  return {
    data: { name, role },
    ...(emailRedirectTo ? { emailRedirectTo } : {}),
  };
}

/** A post-login "next" path is honoured only when it stays on this site. */
export function safeNextPath(next: string | null | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
