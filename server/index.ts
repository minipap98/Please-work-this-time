import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { writeFile } from "fs/promises";
import { join } from "path";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.post("/api/save-default-image", async (req, res) => {
    const { dataUrl } = req.body ?? {};
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      res.status(400).json({ error: "Invalid dataUrl" });
      return;
    }
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(base64, "base64");
    await writeFile(join(process.cwd(), "public", "hero-default.jpg"), buf);
    res.json({ ok: true });
  });

  return app;
}
