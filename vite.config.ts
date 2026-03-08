import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const saveDefaultImagePlugin = {
  name: "save-default-image",
  configureServer(server: any) {
    server.middlewares.use("/api/save-default-image", (req: any, res: any, next: any) => {
      if (req.method !== "POST") { next(); return; }
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const { dataUrl } = JSON.parse(body);
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          writeFileSync(
            path.resolve(__dirname, "public/hero-default.jpg"),
            Buffer.from(base64, "base64")
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(500);
          res.end(JSON.stringify({ ok: false }));
        }
      });
    });
  },
};

export default defineConfig({
  plugins: [react(), saveDefaultImagePlugin],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
  },
  build: {
    outDir: "dist/spa",
  },
});
