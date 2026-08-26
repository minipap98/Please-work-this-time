# Bosun

Marine services marketplace. Boat owners post a job, verified vendors bid, owners book and pay.

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Payments: `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`.

## Database

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/storage-setup.sql`.
3. Run `supabase/migrations/20260825_go_to_market.sql`.
4. Promote yourself:

```sql
update public.profiles set is_admin = true where email = 'you@bosun.app';
```

## Scripts

```bash
pnpm test
pnpm typecheck
pnpm build
```

Owner home after login is `/app`. Marketing site is `/`.
