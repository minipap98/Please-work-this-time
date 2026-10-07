# Bosun

Marine services marketplace. Boat owners post a job, verified vendors bid, owners book and pay.

Monorepo (pnpm workspaces + Turborepo):

| Path | What |
|---|---|
| `apps/web` | The web app: React SPA (`client/`), Express API (`server/`, served as a Vercel function from `api/`) |
| `packages/shared` | `@bosun/shared`: pure TypeScript shared by web, server and mobile (types, pricing, geo, shop logic). No React, no DOM. |
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

## Checks

```bash
pnpm typecheck     # every package
pnpm test          # unit tests in every package (Vitest)
pnpm test:smoke    # Playwright smoke tests for the core web flows; no keys needed
pnpm build         # production build of the web app (dist/spa + dist/server)
```

`pnpm test:smoke` starts the web dev server itself. The first time, install a browser with
`pnpm --filter @bosun/web exec playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_PATH` at one you have.

## Deploy

Vercel builds `apps/web`: set the project's **Root Directory** to `apps/web` (Settings → General) and keep
"Include source files outside of the Root Directory" enabled so the build can read `packages/shared`.
`apps/web/vercel.json` carries the rewrites and headers.

## Database

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/storage-setup.sql`.
3. Run the files in `supabase/migrations/` in date order (under ~6KB at a time, "without RLS").
4. Promote yourself:

```sql
update public.profiles set is_admin = true where email = 'you@bosun.app';
```

Owner home after login is `/app`. Shops land on `/vendor-dashboard`. Marketing site is `/`.
