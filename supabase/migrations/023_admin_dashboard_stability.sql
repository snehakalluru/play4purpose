-- 023_admin_dashboard_stability.sql
-- Stabilize admin dashboard tables across older production schemas.

ALTER TABLE IF EXISTS public.winners
  ADD COLUMN IF NOT EXISTS position int;

CREATE INDEX IF NOT EXISTS idx_winners_position
  ON public.winners(position)
  WHERE position IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admin can read users" ON public.users;
    CREATE POLICY "Admin can read users"
      ON public.users
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.scores') IS NOT NULL THEN
    ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can read own scores" ON public.scores;
    DROP POLICY IF EXISTS "Admin read all scores" ON public.scores;

    CREATE POLICY "Users can read own scores"
      ON public.scores
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Admin read all scores"
      ON public.scores
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;
