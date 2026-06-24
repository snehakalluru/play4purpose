-- 018_audit_alignment.sql
-- Bring the current app and PRD into one contract.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS charity_id uuid,
  ADD COLUMN IF NOT EXISTS contribution_percentage int NOT NULL DEFAULT 10;

ALTER TABLE public.charities
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS events jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_contribution_percentage_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_contribution_percentage_check
  CHECK (contribution_percentage >= 10 AND contribution_percentage <= 100);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_charity_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_charity_id_fkey
      FOREIGN KEY (charity_id) REFERENCES public.charities(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan_type text NOT NULL DEFAULT 'monthly',
  plan text,
  status text NOT NULL DEFAULT 'trial_active',
  is_trial boolean NOT NULL DEFAULT false,
  trial_end_date date,
  trial_reminder_sent_at timestamptz,
  renewal_date date,
  started_at timestamptz,
  expires_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_plan_type_check CHECK (plan_type IN ('monthly', 'yearly')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'inactive', 'trial_active', 'cancelled', 'past_due', 'expired', 'lapsed'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_trial ON public.subscriptions(status, trial_end_date);

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'c'
  LOOP
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%status%' THEN
      EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'inactive', 'trial_active', 'cancelled', 'past_due', 'expired', 'lapsed'));

CREATE TABLE IF NOT EXISTS public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_value int NOT NULL CHECK (score_value BETWEEN 1 AND 45),
  score_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scores_user_date_unique UNIQUE (user_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_date ON public.scores(score_date DESC);

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.scores'::regclass
      AND contype = 'c'
  LOOP
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%score_value%' THEN
      EXECUTE format('ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.draw_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT draw_entries_user_unique UNIQUE (draw_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON public.draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON public.draw_entries(user_id);

ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS prize_pool numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jackpot_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_prize numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS third_prize numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winning_number text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

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
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%status%' THEN
      EXECUTE format('ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.draws
  ADD CONSTRAINT draws_status_check
  CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'simulation', 'published'));

ALTER TABLE public.winners
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_type text;

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS transaction_reference text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.payouts'::regclass
      AND contype = 'c'
  LOOP
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname)) ILIKE '%status%' THEN
      EXECUTE format('ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('pending', 'paid', 'completed'));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
