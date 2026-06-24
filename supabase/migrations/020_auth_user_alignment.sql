-- 020_auth_user_alignment.sql
-- Final identity/subscription alignment. Safe to rerun.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS charity_id uuid,
  ADD COLUMN IF NOT EXISTS contribution_percentage int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial_active',
  ADD COLUMN IF NOT EXISTS trial_end date,
  ADD COLUMN IF NOT EXISTS trial_end_date date,
  ADD COLUMN IF NOT EXISTS privacy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET trial_end = COALESCE(trial_end, trial_end_date),
    trial_end_date = COALESCE(trial_end_date, trial_end),
    subscription_status = CASE
      WHEN subscription_status IN ('active', 'trial_active', 'expired') THEN subscription_status
      WHEN subscription_status IS NULL THEN 'trial_active'
      ELSE 'expired'
    END;

DELETE FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
);

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%REFERENCES auth.users%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_auth_users_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check,
  DROP CONSTRAINT IF EXISTS profiles_contribution_percentage_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('trial_active', 'active', 'expired')),
  ADD CONSTRAINT profiles_contribution_percentage_check
  CHECK (contribution_percentage BETWEEN 10 AND 100);

ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

ALTER TABLE public.charities
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS events jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.charities
SET is_active = COALESCE(active, is_active, true),
    active = COALESCE(active, is_active, true);

CREATE INDEX IF NOT EXISTS idx_charities_is_active ON public.charities(is_active);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan_type text NOT NULL DEFAULT 'monthly',
  plan text,
  status text NOT NULL DEFAULT 'trial_active',
  is_trial boolean NOT NULL DEFAULT true,
  trial_end date,
  trial_end_date date,
  trial_reminder_sent_at timestamptz,
  renewal_date date,
  started_at timestamptz,
  expires_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_end date,
  ADD COLUMN IF NOT EXISTS trial_end_date date,
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_date date,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

UPDATE public.subscriptions
SET trial_end = COALESCE(trial_end, trial_end_date),
    trial_end_date = COALESCE(trial_end_date, trial_end),
    status = CASE
      WHEN status IN ('active', 'trial_active', 'expired') THEN status
      WHEN status IS NULL THEN 'trial_active'
      ELSE 'expired'
    END,
    is_trial = CASE WHEN status = 'trial_active' THEN true ELSE COALESCE(is_trial, false) END;

DELETE FROM public.subscriptions s
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = s.user_id
);

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype IN ('f', 'c')
  LOOP
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname AND conrelid = 'public.subscriptions'::regclass)) ILIKE '%user_id%'
       OR pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname AND conrelid = 'public.subscriptions'::regclass)) ILIKE '%status%' THEN
      EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_auth_users_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial_active', 'active', 'expired'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_trial ON public.subscriptions(status, trial_end);

CREATE TABLE IF NOT EXISTS public.user_charities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id uuid NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  contribution_percentage int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_charities
  ADD COLUMN IF NOT EXISTS contribution_percentage int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DELETE FROM public.user_charities uc
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = uc.user_id
)
OR NOT EXISTS (
  SELECT 1 FROM public.charities c WHERE c.id = uc.charity_id
);

DELETE FROM public.user_charities uc
USING public.user_charities newer
WHERE newer.user_id = uc.user_id
  AND (
    newer.created_at > uc.created_at
    OR (newer.created_at = uc.created_at AND newer.id > uc.id)
  );

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_charities'::regclass
      AND contype IN ('f', 'u', 'c')
  LOOP
    IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname AND conrelid = 'public.user_charities'::regclass)) ILIKE '%user_id%'
       OR pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname AND conrelid = 'public.user_charities'::regclass)) ILIKE '%charity_id%'
       OR pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = c.conname AND conrelid = 'public.user_charities'::regclass)) ILIKE '%contribution_percentage%' THEN
      EXECUTE format('ALTER TABLE public.user_charities DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.user_charities
  ADD CONSTRAINT user_charities_user_id_auth_users_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_charities_charity_id_fkey
  FOREIGN KEY (charity_id) REFERENCES public.charities(id) ON DELETE RESTRICT,
  ADD CONSTRAINT user_charities_user_id_unique UNIQUE (user_id),
  ADD CONSTRAINT user_charities_contribution_percentage_check
  CHECK (contribution_percentage BETWEEN 10 AND 100);

CREATE INDEX IF NOT EXISTS idx_user_charities_user_id ON public.user_charities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_charities_charity_id ON public.user_charities(charity_id);

DO $$
DECLARE
  target_table text;
  c record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['scores', 'draw_entries', 'winners', 'payouts']
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = target_table
           AND column_name = 'user_id'
       ) THEN
      EXECUTE format(
        'DELETE FROM public.%I t WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)',
        target_table
      );

      FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = ('public.' || target_table)::regclass
          AND contype = 'f'
          AND pg_get_constraintdef(oid) ILIKE '%user_id%'
      LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', target_table, c.conname);
      END LOOP;

      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
        target_table,
        target_table || '_user_id_auth_users_fkey'
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.user_dashboard_view AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.phone,
  p.role,
  COALESCE(uc.charity_id, p.charity_id) AS selected_charity_id,
  COALESCE(uc.contribution_percentage, p.contribution_percentage) AS selected_contribution_percentage,
  p.charity_id AS profile_charity_id,
  p.contribution_percentage AS profile_contribution_percentage,
  p.subscription_status AS profile_subscription_status,
  COALESCE(p.trial_end, p.trial_end_date) AS profile_trial_end,
  COALESCE(p.trial_end_date, p.trial_end) AS profile_trial_end_date,
  p.privacy_accepted,
  p.terms_accepted,
  p.created_at AS profile_created_at,
  s.id AS subscription_id,
  s.plan_type,
  s.status AS subscription_status,
  s.is_trial,
  COALESCE(s.trial_end, s.trial_end_date) AS subscription_trial_end,
  COALESCE(s.trial_end_date, s.trial_end) AS subscription_trial_end_date,
  s.renewal_date,
  s.started_at,
  s.expires_at,
  s.current_period_start,
  s.current_period_end,
  uc.id AS user_charity_id,
  uc.created_at AS user_charity_created_at,
  c.name AS charity_name,
  c.description AS charity_description,
  c.is_active AS charity_active,
  c.image_url AS charity_image_url,
  c.logo_url AS charity_logo_url,
  c.events AS charity_events
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT *
  FROM public.subscriptions s
  WHERE s.user_id = p.id
  ORDER BY s.created_at DESC
  LIMIT 1
) s ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM public.user_charities uc
  WHERE uc.user_id = p.id
  ORDER BY uc.created_at DESC
  LIMIT 1
) uc ON true
LEFT JOIN public.charities c ON c.id = COALESCE(uc.charity_id, p.charity_id);
