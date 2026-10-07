# Bosun

Bosun is a marine services marketplace (React + Express + Supabase + Stripe).

## Repository layout

pnpm workspaces + Turborepo. `apps/web` is the web app (everything below under `client/`, `server/`, `api/`, `public/` lives there). `packages/shared` (`@bosun/shared`) holds the pure TypeScript both the web app and the iOS app use: paths written as `shared/x.ts` below mean `packages/shared/src/x.ts`; the web app imports it as `@shared/x`. Shared code must not import React, the DOM, `import.meta.env` or `localStorage`; its tests run in Node so a browser API slipping in fails there. `apps/mobile` is the Expo iOS app (in progress). `supabase/` stays at the root. Run everything from the root: `pnpm dev` (web), `pnpm typecheck`, `pnpm test` (unit tests in every package), `pnpm test:smoke` (Playwright against the web dev server, needs no keys), `pnpm build`. Each app has its own `.env` (`apps/web/.env`, copy from `apps/web/.env.example`). Vercel builds `apps/web` (project Root Directory). Any change to the web app must keep `pnpm typecheck`, `pnpm test` and `pnpm test:smoke` green.

Signed-in pages render inside `client/components/app/AppShell.tsx` (navy sidebar on desktop, top bar, bottom tabs on phones, slate-50 canvas); pages don't render their own header. Build pages from `client/components/app/Page.tsx` (`PageContainer`, `PageHeader`, `Panel`, `StatTile`/`StatGrid`) and the theme tokens in `client/global.css` (primary = brand navy, accent = sky). Auth is required for live accounts. The public splash at `/` plays the animated wordmark (`client/components/marketing/BosunLogo.tsx`, letter crops in `public/brand/`) and splits visitors into fully separate marketing: `/boaters` and `/shops`. Keep owner and shop messaging on their own pages. The owner dashboard is `/app`. Vendors land on `/vendor-dashboard`. Admin is `/admin` and requires `profiles.is_admin`. It is for the Bosun team only: everything goes through `/api/admin/*` (`server/routes/admin.ts`, service role after an `is_admin` check, every action logged to `admin_audit`). Tabs: People/Shops (suspend via auth ban, make admin, verify shop → `vendor_profiles.verified_at`, password reset, delete), Demand (jobs grouped by area × trade with how many shops bid; `demandCells()` in `shared/admin.ts`), Prospects (`prospects` table: marine shops to recruit, found with Google Places text search via `GOOGLE_PLACES_SERVER_KEY`, scored by nearby thin demand with `prospectScore()`, statuses/notes/follow-ups, Claude-written outreach drafts), AI usage (every Claude call in `ai_usage`, top accounts flagged past `AI_ALERT_USD_30D`), Audit log.

Every Claude call runs inside a per-account quota (`server/lib/ai-usage.ts`, `shared/aiUsage.ts`): `consume_ai_quota()` reserves an `ai_usage` row against the daily/monthly limits in `ai_limits` (needs `SUPABASE_SERVICE_ROLE_KEY`; without it the AI routes answer `not_configured`), the call's tokens and estimated cost are recorded after, and files are hashed so the same bytes are read once and reused. PDFs over `MAX_PDF_PAGES` are refused before anything is spent.

Demo mode (`/demo` or landing “Try the demo”) restores canned owner services and vendor RFPs from `client/data/projectData.ts` without a login. It does not write to Supabase. Live jobs stay behind Log In.

Jobs and bids persist in Supabase (`client/lib/marketplace.ts`). Payments go through `POST /api/payments/create-intent`. Do not store a shared admin password in the client.

Prefer pnpm. After schema.sql, run the migrations in `supabase/migrations/` in date order (`20260825_go_to_market.sql`, `20260826_vendor_loop.sql`, `20261002_shop_os.sql`, `20261003_parts_for_boats.sql`, `20261004_privacy_and_finish_shop.sql`, `20261005_shipments_policy_and_hardening.sql`, `20261006_profiles_privacy.sql`, `20261007_shop_crew.sql`, `20261008_crew_roles.sql`, `20261009_boat_history_share.sql`, `20261010_vendor_insights.sql`, `20261011_invoice_import.sql`, `20261012_model_insights.sql`, `20261013_locations.sql`, `20261014_service_plans.sql`, `20261015_shop_customers.sql`, `20261016_billing.sql`, `20261017_admin.sql`, `20261018_receipt_inbox.sql`, `20261019_shops_read_awarded_boats.sql`, `20261020_boat_photo_frame.sql`, `20261021_ai_usage.sql`). Public service-history links (`/history/:token`) read only through `public_boat_history()`: no notes, no owner identity, costs only when the owner turns them on (off by default). Crew roles: `tech` (own jobs at `/tech`) or `manager` (whole board at `/crew-shop`, no QuickBooks/settings/crew changes). Rename crew with `rename_crew_member()` so assigned jobs follow. Vendor home `/vendor-dashboard` is the Today screen (`TodayPanel`, `shopAlerts` in `shared/shop.ts`); crew members use `/tech` (login only, no onboarding) and see only jobs assigned to their `shop_members.tech_name`. `/parts` is the Bosun Parts coming-soon page. Vendor Insights (`/vendor-insights`, formerly Business Hub at `/vendor-business`) compares a shop's price and acceptance rate with its market via `vendor_market_insights()` (own bids only; job-level competition only when 2+ other shops bid, category market only when 3+; logic in `shared/insights.ts`). The demo shop is Dean's Marine. Profiles are private to people who work together (`can_see_profile`); show other people's names via `profile_cards()`, never by joining `profiles`. In the Supabase SQL Editor, run files under ~6KB at a time and choose "without RLS"; longer pastes get truncated. Never add blanket "Allow public read" / "Allow auth insert" policies; every private table relies on scoped rules.

Shops keep customers and boats on file (`shop_customers`, `shop_boats`; Customers tab in `/vendor-shop`, `CustomerDialog`). A work order picks its boat from that list (`boat_id`; the label and customer strings stay on the order for QuickBooks) and its tech and bay from Shop Settings; new boats go through "Add new customer". `deriveRegistry()` builds the list from older orders (the migration backfills live shops; the demo derives it). Billing lives on the work order (`billingStep()` in `shared/shop.ts`: completed → invoice → collect → paid): "Mark complete" in the editor, then "Send invoice" (printable `InvoiceSheet`, mailto summary; sets `invoiced_at` and status `invoiced`) and "Mark paid" (`paid_at`, `payment_method`). QuickBooks export is separate (`exported_at`). The shop search box (`ShopSearchBar`, `searchShop()`) jumps to a customer, boat or WO number; techs search their own jobs on `/tech`.

Every parts shipment is paired with a boat: linked to a work order (boat/customer copied by trigger and kept in sync), a named boat without a work order yet, or shop stock. A WO/PO number on a supplier email links it to the work order automatically.

Shop OS (`/vendor-shop`, `client/hooks/use-shop.ts`, pure logic in `shared/shop.ts`) gives yards work orders, a bay/tech schedule, live inventory (Supabase realtime; part lines and received shipments move stock via DB triggers), inbound parts tracking, and QuickBooks Online CSV / Desktop IIF export. Inbound parts email is `POST /api/inbound/parts-email?secret=INBOUND_EMAIL_SECRET` (needs `SUPABASE_SERVICE_ROLE_KEY`); shops forward mail to `parts+<shop_settings.inbound_email_token>@VITE_INBOUND_EMAIL_DOMAIN`.

The owner Boat Log (`/boat-log`) reads `service_records`. Vendor-verified entries are written only by triggers: when a shop completes a work order linked to a Bosun job it won, or when the owner completes a Bosun job. Owners can add/edit only `source = 'owner'` rows. Owners can import old invoices (PDF/photo) from the Boat Log: the file goes to their own folder in the private `boat-documents` bucket, `POST /api/invoices/extract` (needs `ANTHROPIC_API_KEY`; without it the owner fills the form by hand) reads it with Claude into `shared/invoice.ts`'s schema, and the owner reviews before it's saved as an owner entry with line items and `invoice_path`. Share links never expose invoices. Owners can also email receipts: forward to `receipts@VITE_INBOUND_EMAIL_DOMAIN` (the one inbound webhook, `POST /api/inbound/receipts?secret=INBOUND_EMAIL_SECRET` in `server/routes/receipts-inbound.ts`, routes `parts+<token>@…` to the parts handler and everything else to receipts; the inbound domain is `inbox.getbosun.app`); the sender address must match a `profiles.email`, the attachment (or the email text) is read with Claude into `receipt_inbox`, and `ReceiptInbox` on the dashboard and Boat Log asks the owner to review (same `ImportInvoiceDialog`) before anything is logged. My Boats shows Model insights per boat: admin-curated `model_known_issues` (make + model/engine patterns, technician-reported) plus `model_insights()`, which flags a part replaced on 3+ different boats of the same model or engine (counts only, never records). Don't add known issues you can't source. Maintenance can use a per-boat schedule (`boat_service_plans`, owner-only): `POST /api/maintenance/intervals` asks Claude for the manufacturer schedule for the boat's engines (`shared/servicePlan.ts`), the owner reviews it (track, adjust intervals, mark already done with dates/hours) in `ServiceIntervalsDialog`, and the saved plan replaces the built-in engine list on the Maintenance page and dashboard strip. Boat Log work still counts as done (`shared/maintenanceMatch.ts`). Live owners' boats, photo (`boats.photo_url`, `boat-photos` bucket) and location come from Supabase (`client/hooks/use-my-boat.ts`); browser storage (`my_boat`, `hero_image`, …) backs only the demo. Locations are verified with `client/components/LocationPicker.tsx` (Google Places autocomplete via `client/lib/googleMaps.ts`, ZIP lookup fallback) and stored as lat/lng on profiles, boats (home port) and vendor_profiles (shop + `service_radius_miles`; a trigger keeps the PostGIS `location` in sync). Jobs get coordinates rounded to 2 decimals (`approximate()` in `shared/geo.ts`) so shops see distance, never the exact slip. Saves that include new columns retry without them if a migration hasn't run (`client/lib/optionalColumns.ts`).

# Fusion Starter (template notes below)

A production-ready full-stack React application template with integrated Express server, featuring React Router 6 SPA mode, TypeScript, Vitest, Zod and modern tooling.

While the starter comes with a express server, only create endpoint when strictly neccesary, for example to encapsulate logic that must leave in the server, such as private keys handling, or certain DB operations, db...

## Tech Stack

- **PNPM**: Prefer pnpm
- **Frontend**: React 18 + React Router 6 (spa) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server integrated with Vite dev server
- **Testing**: Vitest
- **UI**: Radix UI + TailwindCSS 3 + Lucide React icons

## Project Structure

```
client/                   # React SPA frontend
├── pages/                # Route components (Index.tsx = home)
├── components/ui/        # Pre-built UI component library
├── App.tsx                # App entry point and with SPA routing setup
└── global.css            # TailwindCSS 3 theming and global styles

server/                   # Express API backend
├── index.ts              # Main server setup (express config + routes)
└── routes/               # API handlers

shared/                   # Types used by both client & server
└── api.ts                # Example of how to share api interfaces
```

## Key Features

## SPA Routing System

The routing system is powered by React Router 6:

- `client/pages/Index.tsx` represents the home page.
- Routes are defined in `client/App.tsx` using the `react-router-dom` import
- Route files are located in the `client/pages/` directory

For example, routes can be defined with:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";

<Routes>
  <Route path="/" element={<Index />} />
  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  <Route path="*" element={<NotFound />} />
</Routes>;
```

### Styling System

- **Primary**: TailwindCSS 3 utility classes
- **Theme and design tokens**: Configure in `client/global.css` 
- **UI components**: Pre-built library in `client/components/ui/`
- **Utility**: `cn()` function combines `clsx` + `tailwind-merge` for conditional classes

```typescript
// cn utility usage
className={cn(
  "base-classes",
  { "conditional-class": condition },
  props.className  // User overrides
)}
```

### Express Server Integration

- **Development**: Single port (8080) for both frontend/backend
- **Hot reload**: Both client and server code
- **API endpoints**: Prefixed with `/api/`

#### Example API Routes
- `GET /api/ping` - Simple ping api
- `GET /api/demo` - Demo endpoint  

### Shared Types
Import consistent types in both client and server:
```typescript
import { DemoResponse } from '@shared/api';
```

Path aliases:
- `@shared/*` - Shared folder
- `@/*` - Client folder

## Development Commands

```bash
pnpm dev        # Start dev server (client + server)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test          # Run Vitest tests
```

## Adding Features

### Add new colors to the theme

Open `client/global.css` and `tailwind.config.ts` and add new tailwind colors.

### New API Route
1. **Optional**: Create a shared interface in `shared/api.ts`:
```typescript
export interface MyRouteResponse {
  message: string;
  // Add other response properties here
}
```

2. Create a new route handler in `server/routes/my-route.ts`:
```typescript
import { RequestHandler } from "express";
import { MyRouteResponse } from "@shared/api"; // Optional: for type safety

export const handleMyRoute: RequestHandler = (req, res) => {
  const response: MyRouteResponse = {
    message: 'Hello from my endpoint!'
  };
  res.json(response);
};
```

3. Register the route in `server/index.ts`:
```typescript
import { handleMyRoute } from "./routes/my-route";

// Add to the createServer function:
app.get("/api/my-endpoint", handleMyRoute);
```

4. Use in React components with type safety:
```typescript
import { MyRouteResponse } from '@shared/api'; // Optional: for type safety

const response = await fetch('/api/my-endpoint');
const data: MyRouteResponse = await response.json();
```

### New Page Route
1. Create component in `client/pages/MyPage.tsx`
2. Add route in `client/App.tsx`:
```typescript
<Route path="/my-page" element={<MyPage />} />
```

## Production Deployment

- **Standard**: `pnpm build`
- **Binary**: Self-contained executables (Linux, macOS, Windows)
- **Cloud Deployment**: Use either Netlify or Vercel via their MCP integrations for easy deployment. Both providers work well with this starter template.

## Architecture Notes

- Single-port development with Vite + Express integration
- TypeScript throughout (client, server, shared)
- Full hot reload for rapid development
- Production-ready with multiple deployment options
- Comprehensive UI component library included
- Type-safe API communication via shared interfaces
