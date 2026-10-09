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

/** Where a password-reset email lands; the web page there lets the person choose a new password. */
export const RESET_PASSWORD_PATH = "/reset-password";

export function resetPasswordRedirect(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}${RESET_PASSWORD_PATH}`;
}

/** Shown after a reset request whether or not the address exists, so the form can't be used to look up accounts. */
export const RESET_SENT_MESSAGE = "If there's a Bosun account for that email, a reset link is on its way. Check spam too.";

/** Supabase refuses sign-in until the address is confirmed; the apps offer to resend the email on this error. */
export function isUnconfirmedEmailError(message: string | null | undefined): boolean {
  return /email not confirmed/i.test(message ?? "");
}

/** What's wrong with a new password (and its confirmation), or null when it can be saved. */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (confirm !== undefined && confirm !== password) return "The two passwords don't match.";
  return null;
}

/** A post-login "next" path is honoured only when it stays on this site. */
export function safeNextPath(next: string | null | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
