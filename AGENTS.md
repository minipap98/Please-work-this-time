# Bosun

Bosun is a marine services marketplace (React + Express + Supabase + Stripe).

Auth is required for live accounts. The public splash at `/` plays the animated wordmark (`client/components/marketing/BosunLogo.tsx`, letter crops in `public/brand/`) and splits visitors into fully separate marketing: `/boaters` and `/shops`. Keep owner and shop messaging on their own pages. The owner dashboard is `/app`. Vendors land on `/vendor-dashboard`. Admin is `/admin` and requires `profiles.is_admin`.

Demo mode (`/demo` or landing “Try the demo”) restores canned owner services and vendor RFPs from `client/data/projectData.ts` without a login. It does not write to Supabase. Live jobs stay behind Log In.

Jobs and bids persist in Supabase (`client/lib/marketplace.ts`). Payments go through `POST /api/payments/create-intent`. Do not store a shared admin password in the client.

Prefer pnpm. After schema.sql, run the migrations in `supabase/migrations/` in date order (`20260825_go_to_market.sql`, `20260826_vendor_loop.sql`, `20261002_shop_os.sql`, `20261003_parts_for_boats.sql`, `20261004_privacy_and_finish_shop.sql`, `20261005_shipments_policy_and_hardening.sql`, `20261006_profiles_privacy.sql`, `20261007_shop_crew.sql`, `20261008_crew_roles.sql`, `20261009_boat_history_share.sql`, `20261010_vendor_insights.sql`, `20261011_invoice_import.sql`, `20261012_model_insights.sql`). Public service-history links (`/history/:token`) read only through `public_boat_history()`: no notes, no owner identity, costs only when the owner turns them on (off by default). Crew roles: `tech` (own jobs at `/tech`) or `manager` (whole board at `/crew-shop`, no QuickBooks/settings/crew changes). Rename crew with `rename_crew_member()` so assigned jobs follow. Vendor home `/vendor-dashboard` is the Today screen (`TodayPanel`, `shopAlerts` in `shared/shop.ts`); crew members use `/tech` (login only, no onboarding) and see only jobs assigned to their `shop_members.tech_name`. `/parts` is the Bosun Parts coming-soon page. Vendor Insights (`/vendor-insights`, formerly Business Hub at `/vendor-business`) compares a shop's price and acceptance rate with its market via `vendor_market_insights()` (own bids only; job-level competition only when 2+ other shops bid, category market only when 3+; logic in `shared/insights.ts`). The demo shop is Dean's Marine. Profiles are private to people who work together (`can_see_profile`); show other people's names via `profile_cards()`, never by joining `profiles`. In the Supabase SQL Editor, run files under ~6KB at a time and choose "without RLS"; longer pastes get truncated. Never add blanket "Allow public read" / "Allow auth insert" policies; every private table relies on scoped rules.

Every parts shipment is paired with a boat: linked to a work order (boat/customer copied by trigger and kept in sync), a named boat without a work order yet, or shop stock. A WO/PO number on a supplier email links it to the work order automatically.

Shop OS (`/vendor-shop`, `client/hooks/use-shop.ts`, pure logic in `shared/shop.ts`) gives yards work orders, a bay/tech schedule, live inventory (Supabase realtime; part lines and received shipments move stock via DB triggers), inbound parts tracking, and QuickBooks Online CSV / Desktop IIF export. Inbound parts email is `POST /api/inbound/parts-email?secret=INBOUND_EMAIL_SECRET` (needs `SUPABASE_SERVICE_ROLE_KEY`); shops forward mail to `parts+<shop_settings.inbound_email_token>@VITE_INBOUND_EMAIL_DOMAIN`.

The owner Boat Log (`/boat-log`) reads `service_records`. Vendor-verified entries are written only by triggers: when a shop completes a work order linked to a Bosun job it won, or when the owner completes a Bosun job. Owners can add/edit only `source = 'owner'` rows. Owners can import old invoices (PDF/photo) from the Boat Log: the file goes to their own folder in the private `boat-documents` bucket, `POST /api/invoices/extract` (needs `ANTHROPIC_API_KEY`; without it the owner fills the form by hand) reads it with Claude into `shared/invoice.ts`'s schema, and the owner reviews before it's saved as an owner entry with line items and `invoice_path`. Share links never expose invoices. My Boats shows Model insights per boat: admin-curated `model_known_issues` (make + model/engine patterns, technician-reported) plus `model_insights()`, which flags a part replaced on 3+ different boats of the same model or engine (counts only, never records). Don't add known issues you can't source. Live owners' boats, photo (`boats.photo_url`, `boat-photos` bucket) and location come from Supabase (`client/hooks/use-my-boat.ts`); browser storage (`my_boat`, `hero_image`, …) backs only the demo.

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
