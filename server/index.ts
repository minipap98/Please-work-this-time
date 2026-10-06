import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import { handleCreatePaymentIntent, handleStripeWebhook } from "./routes/payments.js";
import { handleNotifyJob } from "./routes/notify.js";
import { handleInboundPartsEmail } from "./routes/inbound-email.js";
import { handleInboundReceipt } from "./routes/receipts-inbound.js";
import { handleExtractInvoice, handleInvoiceHealth } from "./routes/invoice-extract.js";
import { handleServiceIntervals } from "./routes/service-intervals.js";
import {
  handleAdminAudit,
  handleAdminDemand,
  handleAdminPeople,
  handleAdminPersonAction,
  handleAdminPersonDetail,
  handleAdminProspectCreate,
  handleAdminProspectDraft,
  handleAdminProspectSearch,
  handleAdminProspectUpdate,
  handleAdminProspects,
} from "./routes/admin.js";

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

  app.use(express.json({ limit: "25mb" })); // inbound receipts arrive with base64 attachments
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
  app.post("/api/inbound/receipts", handleInboundReceipt);
  app.post("/api/invoices/extract", handleExtractInvoice);
  app.get("/api/invoices/health", handleInvoiceHealth);
  app.post("/api/maintenance/intervals", handleServiceIntervals);
  app.get("/api/admin/people", handleAdminPeople);
  app.get("/api/admin/people/:id/detail", handleAdminPersonDetail);
  app.post("/api/admin/people/:id/action", handleAdminPersonAction);
  app.get("/api/admin/demand", handleAdminDemand);
  app.get("/api/admin/prospects", handleAdminProspects);
  app.post("/api/admin/prospects", handleAdminProspectCreate);
  app.post("/api/admin/prospects/search", handleAdminProspectSearch);
  app.post("/api/admin/prospects/:id", handleAdminProspectUpdate);
  app.post("/api/admin/prospects/:id/draft", handleAdminProspectDraft);
  app.get("/api/admin/audit", handleAdminAudit);

  return app;
}
