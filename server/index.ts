import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import { handleCreatePaymentIntent, handleStripeWebhook } from "./routes/payments.js";
import { handleNotifyJob } from "./routes/notify.js";
import { handleInboundPartsEmail } from "./routes/inbound-email.js";
import { handleExtractInvoice, handleInvoiceHealth } from "./routes/invoice-extract.js";
import { handleServiceIntervals } from "./routes/service-intervals.js";

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

  app.use(express.json({ limit: "5mb" }));
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
  app.post("/api/jobs/notify", handleNotifyJob);
  app.post("/api/inbound/parts-email", handleInboundPartsEmail);
  app.post("/api/invoices/extract", handleExtractInvoice);
  app.get("/api/invoices/health", handleInvoiceHealth);
  app.post("/api/maintenance/intervals", handleServiceIntervals);

  return app;
}
