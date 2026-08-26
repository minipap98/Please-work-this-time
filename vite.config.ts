import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const expressPlugin = {
  name: "bosun-express",
  configureServer(server: { middlewares: { use: (app: unknown) => void } }) {
    server.middlewares.use(createServer());
  },
};

export default defineConfig({
  plugins: [react(), expressPlugin],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    outDir: "dist/spa",
  },
});
