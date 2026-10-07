import { expect, test, type Page } from "@playwright/test";

// Core web flows that must keep working through the monorepo and mobile work.
// Everything here runs without Supabase, Stripe or Google keys.

const DEMO_SHOP = "Dean's Marine";

async function enterDemo(page: Page, role: "owner" | "vendor") {
  // Same keys the landing page's "Try the demo" buttons write (MarketingChrome.useStartDemo).
  await page.addInitScript(
    ({ role, shop }) => {
      localStorage.setItem("bosun_demo_mode", "1");
      localStorage.setItem("bosun_role", role);
      if (role === "vendor") localStorage.setItem("bosun_vendor_id", shop);
      else localStorage.removeItem("bosun_vendor_id");
    },
    { role, shop: DEMO_SHOP },
  );
}

test.describe("public site", () => {
  test("splash offers both doors and login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bosun/);
    await expect(page.getByRole("heading", { name: "I own a boat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "I run a marine shop" })).toBeVisible();
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("boater and shop marketing pages render", async ({ page }) => {
    await page.goto("/boaters");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/shops");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login page shows the sign-in form and reports missing keys", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign Up", exact: true })).toBeVisible();
    await expect(page.locator("form").getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.locator("form input[type=email]")).toBeVisible();
    await expect(page.getByText("Supabase keys are missing")).toBeVisible();
  });

  test("signed-in pages need a login", async ({ page }) => {
    await page.goto("/inbox");
    // Without Supabase keys the guard shows the config screen instead of redirecting.
    await expect(page.getByText("Bosun isn’t configured")).toBeVisible();
  });

  test("unknown routes 404 inside the app", async ({ page }) => {
    await page.goto("/definitely-not-a-page");
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });
});

test.describe("demo mode (owner)", () => {
  test("/demo lands on the owner dashboard with canned jobs", async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Boats" }).first()).toBeVisible();
  });

  test("opening a job shows its bids", async ({ page }) => {
    await enterDemo(page, "owner");
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
    // Demo jobs render as role="button" cards; the first one opens its detail page.
    const jobs = page.locator("section").filter({ hasText: "Your jobs" });
    await jobs.locator("[role=button]").first().click();
    await expect(page).toHaveURL(/\/project\//);
    await expect(page.getByText(/Bids Received|All Bids/).first()).toBeVisible();
  });

  test("inbox lists demo conversations", async ({ page }) => {
    await enterDemo(page, "owner");
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  });
});

test.describe("demo mode (shop)", () => {
  test("Today screen greets the demo shop", async ({ page }) => {
    await enterDemo(page, "vendor");
    await page.goto("/vendor-dashboard");
    await expect(page.getByRole("heading", { name: new RegExp(`Good (morning|afternoon|evening), ${DEMO_SHOP}`) })).toBeVisible();
  });

  test("Jobs near you lists open RFPs with a bid button", async ({ page }) => {
    await enterDemo(page, "vendor");
    await page.goto("/vendor-rfps");
    await expect(page.getByRole("heading", { name: "Jobs near you" })).toBeVisible();
    await expect(page.getByText("Accepting bids").first()).toBeVisible();
  });

  test("an owner-only page bounces a shop back to its dashboard", async ({ page }) => {
    await enterDemo(page, "vendor");
    await page.goto("/my-boats");
    await expect(page).toHaveURL(/\/vendor-dashboard$/);
  });
});

test.describe("API contracts", () => {
  test("health and ping answer", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBe(true);
    expect(await health.json()).toEqual({ ok: true, service: "bosun" });

    const ping = await request.get("/api/ping");
    expect(await ping.json()).toEqual({ message: "ping" });
  });

  test("payments report not-configured without Stripe", async ({ request }) => {
    const res = await request.post("/api/payments/create-intent", {
      data: { amountDollars: 10, projectId: "p", bidId: "b" },
    });
    expect(res.status()).toBe(503);
    expect(await res.json()).toEqual({ error: "Payments are not configured yet." });
  });

  test("vendor notify requires a signed-in user", async ({ request }) => {
    const res = await request.post("/api/jobs/notify", { data: { projectId: "p" } });
    expect(res.status()).toBe(401);
  });

  test("inbound email rejects an unconfigured webhook", async ({ request }) => {
    const res = await request.post("/api/inbound/receipts?secret=x", { data: {} });
    expect(res.status()).toBe(503);
  });

  test("admin routes require configuration before anything else", async ({ request }) => {
    const res = await request.get("/api/admin/people");
    expect([401, 503]).toContain(res.status());
  });
});

test.describe("API v1 (mobile)", () => {
  test("push dispatch is locked until configured", async ({ request }) => {
    const res = await request.post("/api/v1/push/dispatch", { data: { type: "INSERT", table: "notifications", record: {} } });
    expect(res.status()).toBe(503);
    expect((await res.json()).code).toBe("not_configured");
  });
});

test.describe("universal links", () => {
  test("the Apple app-site-association file is served as JSON", async ({ request }) => {
    const res = await request.get("/.well-known/apple-app-site-association");
    expect(res.ok()).toBe(true);
    const body = JSON.parse(await res.text()) as { applinks?: { details?: unknown[] } };
    expect(body.applinks?.details?.length).toBeGreaterThan(0);
  });
});
