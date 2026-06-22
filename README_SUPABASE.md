# Supabase setup

Quick steps to connect this project to Supabase locally and in production.

1) Create a Supabase project
  - Go to https://app.supabase.com and create a new project.

2) Obtain credentials
  - Project URL: Settings → API → Project URL
  - Anon key: Settings → API → anon public
  - Service role key (server-only): Settings → API → Service Role

3) Add environment variables
  - Copy values into a local `.env.local` (do NOT commit service role key).

Example `.env.local` (based on `.env.example`):

NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

4) Apply SQL migrations

Option A — psql (recommended when you have DB connection string):

  - Get the full DB connection string from Supabase (Settings → Database → Connection string)
  - In Bash:

    export SUPABASE_DB_CONN="postgresql://user:password@host:5432/dbname"
    for f in supabase/migrations/*.sql; do psql "$SUPABASE_DB_CONN" -f "$f"; done

  - In PowerShell (Windows):

    $env:SUPABASE_DB_CONN = "postgresql://user:password@host:5432/dbname"
    Get-ChildItem supabase/migrations -Filter *.sql | ForEach-Object { psql $env:SUPABASE_DB_CONN -f $_.FullName }

Option B — Supabase CLI (if you prefer):

  - Install: `npm install -g supabase` or follow https://supabase.com/docs/guides/cli
  - Login: `supabase login`
  - Link the project: `supabase link --project-ref <project-ref>`
  - Run SQL: `supabase db remote set --db-url "$SUPABASE_DB_CONN"` then run each `supabase db query < migration-file` or use `psql` as above.

5) Run the app

  - Install dependencies: `pnpm install`
  - Start dev server: `pnpm dev`

Notes
  - Never commit `SUPABASE_SERVICE_ROLE_KEY` to git. Use platform secrets (Vercel, Netlify, etc.) for production.
  - If you use Supabase Auth, ensure the `profiles` table `id` matches auth user `id` when creating seeded users.
