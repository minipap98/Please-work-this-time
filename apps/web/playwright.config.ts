import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Smoke tests for the core web flows. They run against the dev server with no
// Supabase or Stripe keys: the public pages, the demo, and the API contracts
// all work without them. Run with `pnpm test:smoke` from apps/web or the root.

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// A preinstalled Chromium (CI images, cloud sandboxes) can be pointed at with
// PLAYWRIGHT_CHROMIUM_PATH; otherwise Playwright uses the browser it installed.
const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Keys from a local .env must not leak into the smoke run: the tests assert
    // the unconfigured behaviour (demo mode, 503s) so they pass anywhere.
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      STRIPE_SECRET_KEY: "",
      VITE_STRIPE_PUBLISHABLE_KEY: "",
      VITE_DEMO_MODE: "",
    },
  },
});
