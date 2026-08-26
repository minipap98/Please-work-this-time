import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleCreatePaymentIntent, handleStripeWebhook } from "./routes/payments";

export function createServer() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));

  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      (req as { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    handleStripeWebhook
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "bosun" });
  });

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/payments/create-intent", handleCreatePaymentIntent);

  return app;
}
