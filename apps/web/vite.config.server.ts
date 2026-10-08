import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist/server",
    ssr: true,
    target: "node20",
    rollupOptions: {
      // node-build: `pnpm start` (serves the SPA and the API on one port).
      // vercel: the API alone, re-exported by api/index.js for the Vercel function.
      input: {
        "node-build": "server/node-build.ts",
        vercel: "server/vercel.ts",
      },
      output: {
        entryFileNames: "[name].mjs",
        format: "esm",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
