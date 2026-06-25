-- 025_monthly_match_draw_system.sql
-- Non-destructive alignment for monthly 5-number draw simulations and published results.

ALTER TABLE IF EXISTS public.draws
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS draw_date date,
  ADD COLUMN IF NOT EXISTS draw_month date,
  ADD COLUMN IF NOT EXISTS draw_type text,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS numbers int[],
  ADD COLUMN IF NOT EXISTS winning_numbers jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS prize_pool numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jackpot_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_prize numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS third_prize numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winning_number text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE public.draws
SET draw_date = COALESCE(draw_date, draw_month, created_at::date)
WHERE draw_date IS NULL;

UPDATE public.draws
SET draw_month = COALESCE(draw_month, date_trunc('month', draw_date)::date)
WHERE draw_month IS NULL;

UPDATE public.draws
SET draw_type = COALESCE(draw_type, mode, 'random')
WHERE draw_type IS NULL;

UPDATE public.draws
SET mode = COALESCE(mode, draw_type, 'random')
WHERE mode IS NULL;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.draws'::regclass
      AND contype = 'c'
  LOOP
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%status%'
      OR pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%draw_type%'
      OR pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%mode%' THEN
      EXECUTE format('ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.draws
  DROP CONSTRAINT IF EXISTS draws_status_check,
  DROP CONSTRAINT IF EXISTS draws_draw_type_check,
  DROP CONSTRAINT IF EXISTS draws_mode_check;

ALTER TABLE IF EXISTS public.draws
  ADD CONSTRAINT draws_status_check
  CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'simulation', 'published'));

ALTER TABLE IF EXISTS public.draws
  ADD CONSTRAINT draws_draw_type_check
  CHECK (draw_type IS NULL OR draw_type IN ('random', 'algorithmic'));

ALTER TABLE IF EXISTS public.draws
  ADD CONSTRAINT draws_mode_check
  CHECK (mode IS NULL OR mode IN ('random', 'algorithmic'));

ALTER TABLE IF EXISTS public.draw_entries
  ADD COLUMN IF NOT EXISTS entry_number text,
  ADD COLUMN IF NOT EXISTS numbers jsonb,
  ADD COLUMN IF NOT EXISTS match_count int;

ALTER TABLE IF EXISTS public.winners
  ADD COLUMN IF NOT EXISTS draw_entry_id uuid,
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS match_count int,
  ADD COLUMN IF NOT EXISTS match_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.prize_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid REFERENCES public.draws(id) ON DELETE CASCADE,
  total_pool numeric(14,2) NOT NULL DEFAULT 0,
  pool_5_match numeric(14,2) NOT NULL DEFAULT 0,
  pool_4_match numeric(14,2) NOT NULL DEFAULT 0,
  pool_3_match numeric(14,2) NOT NULL DEFAULT 0,
  jackpot_amount numeric(14,2) NOT NULL DEFAULT 0,
  second_amount numeric(14,2) NOT NULL DEFAULT 0,
  third_amount numeric(14,2) NOT NULL DEFAULT 0,
  rollover_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draws_monthly_published
  ON public.draws(draw_date, status);

CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_user
  ON public.draw_entries(draw_id, user_id);

CREATE INDEX IF NOT EXISTS idx_winners_draw_match
  ON public.winners(draw_id, match_count, match_type);

CREATE INDEX IF NOT EXISTS idx_prize_pools_created_at
  ON public.prize_pools(created_at DESC);
