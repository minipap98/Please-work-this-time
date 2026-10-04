import type { RequestHandler } from "express";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  dollarsToCents,
  validatePaymentCents,
  type CreatePaymentIntentRequest,
  type CreatePaymentIntentResponse,
} from "../../shared/api.js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

async function getUserFromRequest(req: { headers: { authorization?: string } }) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export const handleCreatePaymentIntent: RequestHandler = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: "Payments are not configured yet." });
      return;
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Sign in to pay." });
      return;
    }

    const body = (req.body ?? {}) as CreatePaymentIntentRequest;
    const cents = dollarsToCents(Number(body.amountDollars));
    const check = validatePaymentCents(cents);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }
    if (!body.projectId || !body.bidId) {
      res.status(400).json({ error: "Missing project or bid." });
      return;
    }

    const intent = await stripe.paymentIntents.create({
      amount: check.cents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        projectId: String(body.projectId),
        bidId: String(body.bidId),
        payerId: user.id,
        label: body.label ?? "Bosun deposit",
      },
      description: body.label ? `Bosun — ${body.label}` : "Bosun marine service payment",
    });

    if (!intent.client_secret) {
      res.status(500).json({ error: "Stripe did not return a client secret." });
      return;
    }

    const response: CreatePaymentIntentResponse = {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents: check.cents,
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment failed.";
    res.status(500).json({ error: message });
  }
};

export const handleStripeWebhook: RequestHandler = async (req, res) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    res.status(503).json({ error: "Webhook is not configured." });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).json({ error: "Missing Stripe signature." });
    return;
  }

  let event: Stripe.Event;
  try {
    const raw = (req as { rawBody?: Buffer }).rawBody ?? req.body;
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    res.status(400).json({ error: "Invalid webhook signature." });
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && service) {
      const admin = createClient(url, service);
      await admin.from("payments").upsert(
        {
          stripe_payment_intent_id: intent.id,
          amount: (intent.amount ?? 0) / 100,
          platform_fee: 0,
          status: "completed",
          payer_id: intent.metadata?.payerId || null,
          project_id: intent.metadata?.projectId || null,
          bid_id: intent.metadata?.bidId || null,
        } as never,
        { onConflict: "stripe_payment_intent_id" }
      );
    }
  }

  res.json({ received: true });
};
