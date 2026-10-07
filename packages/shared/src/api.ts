/**
 * Shared types and pure helpers used by both the client and the Express server.
 */

export interface DemoResponse {
  message: string;
}

export interface CreatePaymentIntentRequest {
  amountDollars: number;
  projectId: string;
  bidId: string;
  label?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
}

export interface PaymentIntentError {
  error: string;
}

/** Minimum charge: $1.00 */
export const MIN_PAYMENT_CENTS = 100;
/** Maximum charge: $50,000.00 — flag anything larger for manual review */
export const MAX_PAYMENT_CENTS = 5_000_000;

export function dollarsToCents(amountDollars: number): number {
  if (!Number.isFinite(amountDollars)) return NaN;
  return Math.round(amountDollars * 100);
}

export function validatePaymentCents(
  cents: number
): { ok: true; cents: number } | { ok: false; error: string } {
  if (!Number.isInteger(cents) || !Number.isFinite(cents)) {
    return { ok: false, error: "Amount must be a valid dollar value." };
  }
  if (cents < MIN_PAYMENT_CENTS) {
    return { ok: false, error: "Minimum payment is $1.00." };
  }
  if (cents > MAX_PAYMENT_CENTS) {
    return { ok: false, error: "Amount exceeds the $50,000 per-charge limit." };
  }
  return { ok: true, cents };
}

export type AppRole = "owner" | "vendor";

export function postLoginPath(
  role: AppRole | null | undefined,
  onboardingComplete: boolean | null | undefined
): string {
  if (!onboardingComplete) return "/onboarding";
  if (role === "vendor") return "/vendor-dashboard";
  return "/app";
}

export function isActiveProjectStatus(status: string): boolean {
  return (
    status === "active" ||
    status === "bidding" ||
    status === "in-progress" ||
    status === "gathering"
  );
}
