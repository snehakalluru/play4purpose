Play4Purpose — Phase 1 Foundation
=================================

This repository contains the Phase 1 foundation for Play4Purpose: a production-quality MVP skeleton including project structure, Supabase schema, RLS policies, auth middleware architecture, TypeScript types, Zod validators, design tokens and environment templates.

Phase 1 goal: create complete application foundation — no UI pages yet.

See `PROJECT_TREE.md` for the full folder layout.

Quick start

1. Copy `.env.example` to `.env` and fill secrets.
2. Create a Supabase project and run `supabase/migrations/001_init.sql` in the SQL editor (or use your migration tooling).
3. Apply RLS policies in `supabase/policies/`.
4. Configure Stripe & Resend keys in environment variables.
5. Run locally:

```bash
pnpm install
pnpm dev
```

For full setup steps, see the **Supabase setup** and **Stripe setup** sections in this README.

--

Project status: Phase 1 complete (foundation only).

Supabase setup
--------------

1. Create a Supabase project.
2. In SQL editor, run `supabase/migrations/001_init.sql`.
3. In SQL editor, run the files in `supabase/policies/` to enable RLS and policies.
4. Configure Auth providers and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`.

Stripe setup
------------

1. Create a Stripe account and products/plans for your subscription tiers.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `.env`.
3. Webhook endpoints will be implemented in Phase 2; verify webhooks locally using `stripe listen`.

