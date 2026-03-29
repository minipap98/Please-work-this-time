import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";

interface PaymentFormProps {
  amount: number;
  label: string;
  vendorName: string;
  projectTitle: string;
  onSuccess: (paymentInfo: { amount: number; date: string; method: string }) => void;
  onCancel: () => void;
}

function PaymentForm({ amount, label, vendorName, projectTitle, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found");
      setProcessing(false);
      return;
    }

    // Create a payment method with Stripe
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: {
        name: "Dean", // In production, get from auth context
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    // In production, you'd send paymentMethod.id to your backend to create a PaymentIntent
    // For now, we simulate a successful payment since we're in test mode
    if (paymentMethod) {
      const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      onSuccess({
        amount,
        date,
        method: `•••• ${paymentMethod.card?.last4 ?? "0000"}`,
      });
    }

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

          <p className="text-xs text-muted-foreground mt-3">
            Test mode — use card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC.
          </p>

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
  onSuccess: (paymentInfo: { amount: number; date: string; method: string }) => void;
  onCancel: () => void;
}

export default function StripePayment(props: StripePaymentProps) {
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background border border-border rounded-xl p-6 max-w-sm mx-4 text-center">
          <p className="text-sm text-muted-foreground">Stripe is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to your environment.</p>
          <button onClick={props.onCancel} className="mt-4 px-4 py-2 rounded-md border border-border text-sm font-semibold">Close</button>
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
