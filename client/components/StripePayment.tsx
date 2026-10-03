import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { CreatePaymentIntentResponse } from "@shared/api";

interface PaymentFormProps {
  amount: number;
  label: string;
  vendorName: string;
  projectTitle: string;
  projectId?: string;
  bidId?: string;
  onSuccess: (paymentInfo: { amount: number; date: string; method: string }) => void;
  onCancel: () => void;
}

function PaymentForm({ amount, label, vendorName, projectTitle, projectId, bidId, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { profile } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!projectId || !bidId) {
      setError("Missing job or bid. Refresh and try again.");
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found");
      setProcessing(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Sign in again to pay.");
      setProcessing(false);
      return;
    }

    const intentRes = await fetch("/api/payments/create-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amountDollars: amount,
        projectId,
        bidId,
        label,
      }),
    });
    const intentJson = (await intentRes.json()) as CreatePaymentIntentResponse & { error?: string };
    if (!intentRes.ok || !intentJson.clientSecret) {
      setError(intentJson.error ?? "Could not start payment.");
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(intentJson.clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: profile?.name ?? undefined,
          email: profile?.email ?? undefined,
        },
      },
    });

    if (confirmError || paymentIntent?.status !== "succeeded") {
      setError(confirmError?.message ?? "Payment was not completed.");
      setProcessing(false);
      return;
    }

    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const last4 =
      paymentIntent.payment_method && typeof paymentIntent.payment_method !== "string"
        ? paymentIntent.payment_method.card?.last4
        : undefined;
    onSuccess({
      amount,
      date,
      method: `•••• ${last4 ?? "card"}`,
    });
    setProcessing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Payment</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{projectTitle}</p>
        </div>

        {/* Summary */}
        <div className="px-6 pt-4">
          <div className="bg-muted/40 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">To: {vendorName}</p>
              </div>
              <p className="text-lg font-bold text-foreground">${amount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Card form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Card details</label>
          <div className="border border-border rounded-lg p-3 bg-background">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#1a1a1a",
                    "::placeholder": { color: "#9ca3af" },
                  },
                  invalid: { color: "#ef4444" },
                },
              }}
            />
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          {import.meta.env.DEV && (
            <p className="text-xs text-muted-foreground mt-3">
              Test mode — use card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC.
            </p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || processing}
              className="flex-1 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {processing ? "Processing…" : `Pay $${amount.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StripePaymentProps {
  amount: number;
  label: string;
  vendorName: string;
  projectTitle: string;
  projectId?: string;
  bidId?: string;
  onSuccess: (paymentInfo: { amount: number; date: string; method: string }) => void;
  onCancel: () => void;
}

export default function StripePayment(props: StripePaymentProps) {
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background border border-border rounded-xl p-6 max-w-sm mx-4 text-center">
          <p className="text-sm font-semibold text-foreground">Online payments are coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">
            For now, pay {props.vendorName} directly. Nothing has been charged.
          </p>
          <button onClick={props.onCancel} className="mt-4 px-4 py-2 rounded-md border border-border text-sm font-semibold">Got it</button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}
