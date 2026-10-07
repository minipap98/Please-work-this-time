# Bosun

Marine services marketplace. Boat owners post a job, verified shops bid, owners book and pay.

Monorepo (pnpm workspaces + Turborepo):

| Path | What |
|---|---|
| `apps/web` | The web app: React SPA (`client/`), Express API (`server/`, served as a Vercel function from `api/`) |
| `apps/mobile` | The iOS app (Expo + expo-router + TypeScript). Same accounts, same database, same API. |
| `packages/shared` | `@bosun/shared`: pure TypeScript shared by web, server and mobile (types, validation, pricing, geo, marketplace data functions). No React, no DOM. |
| `supabase` | Schema, migrations, storage setup, seed script |

## Run the web app locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # fill in your keys
pnpm dev                                 # http://127.0.0.1:5173, API on the same port under /api
```

Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Payments: `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`.
Without keys the public site and the demo (`/demo`) still work.

## Run the iOS app locally

You need a Mac with Xcode and an iOS simulator (or a device), plus an Expo account for EAS.

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
cd apps/mobile
npx expo prebuild --platform ios               # generates the ios/ project (first time, and after changing app.json)
npx expo run:ios                               # builds a development build and opens the simulator
```

Or build the dev client once in the cloud and reuse it:

```bash
cd apps/mobile
eas login && eas init                          # writes extra.eas.projectId into app.json
eas build --profile development --platform ios # simulator build (eas.json → development)
pnpm start                                     # Metro; the dev build connects to it
```

`apps/mobile/plugins/withSceneDelegate.js` adopts the UIScene life cycle iOS 27 requires at launch; it runs during prebuild and can be removed once Expo's template does the same.

Push notifications need a physical device, an EAS project id, the APNs key on EAS, and `PUSH_WEBHOOK_SECRET` set on the server (see `supabase/migrations/20261025_push_webhook.sql`). The simulator shows everything else.

What's in the app (v1): sign up / sign in, onboarding, post a job with camera or library photos, bids and accepting one, messaging, notifications, the shop's "Jobs near you" feed, bidding, My bids, shop profile, crew, push notifications, and universal links from getbosun.app. Boats, Boat Log, maintenance schedules, Shop OS and billing stay on the web.

## Checks

```bash
pnpm typecheck     # every package (web, mobile, shared)
pnpm test          # unit tests in every package (Vitest)
pnpm test:smoke    # Playwright smoke tests for the core web flows; no keys needed
pnpm build         # production build of the web app (dist/spa + dist/server)
pnpm --filter @bosun/mobile export:ios   # Metro bundle of the iOS app (no Mac needed; proves it compiles)
```

`pnpm test:smoke` starts the web dev server itself. The first time, install a browser with
`pnpm --filter @bosun/web exec playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_PATH` at one you have.

## Deploy

**Web.** Vercel builds `apps/web`: the project's **Root Directory** is `apps/web` (Settings → General) with
"Include source files outside of the Root Directory" enabled so the build can read `packages/shared`.
`apps/web/vercel.json` carries the rewrites and headers, including the universal-links association file.

**iOS.** `apps/mobile/eas.json` has `development` (simulator), `preview` (internal TestFlight) and `production`
profiles. `eas build --profile production --platform ios` then `eas submit --platform ios`. The checklist of
everything to set up in App Store Connect and Apple Developer is in [`apps/mobile/APP_STORE.md`](apps/mobile/APP_STORE.md).

## Database

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/storage-setup.sql`.
3. Run the files in `supabase/migrations/` in date order (under ~6KB at a time, "without RLS").
   The mobile app needs `20261022` through `20261027`; the web works with or without them.
4. Promote yourself:

```sql
update public.profiles set is_admin = true where email = 'you@bosun.app';
```

Owner home after login is `/app`. Shops land on `/vendor-dashboard`. Marketing site is `/`.
