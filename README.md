# INAYA Admin
React + Vite + TypeScript + Tailwind admin for the shared INAYA Supabase project.

## Setup
1. Supabase SQL editor: run `supabase/migrations/001_inaya_core.sql`, then `supabase/seed.sql`.
2. Auth → create your first user, then run the commented `insert into profiles ...` line in `seed.sql` with that user's UUID (role `owner`).
3. `cp .env.example .env`, fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/publishable key only; never the service-role key).
4. `npm install && npm run dev`

## Deploy on Render
Blueprint (`render.yaml`) or manually: New → Static Site, build `npm install && npm run build`, publish dir `dist`, rewrite `/*` → `/index.html`. Add the two env vars in the Render dashboard.

## Security model
RLS is on for every table. Staff can read orders/payments; direct writes to orders, payments and stock are blocked. Status changes, payment verification, notes and stock adjustments run through `security definer` functions that check the caller's role, and every change to key tables is written to `audit_logs`.

## Not yet built (see list in chat)
Variants UI, image upload UI, coupons/promotions/banners/settings UI, delivery/courier UI, reports + CSV, staff management UI, server-side `place_order` for the storefront.
