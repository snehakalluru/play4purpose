-- 008_profiles_onboarding.sql
-- Add onboarding fields to profiles and tighten charity/score constraints

-- Add columns to profiles for onboarding and compliance
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS handicap numeric(5,2),
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure email is unique at DB-level when present
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'profiles_email_unique'
         AND conrelid = 'public.profiles'::regclass
     ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END$$;

-- Tighten user_charities contribution percentage to allowed set
ALTER TABLE IF EXISTS user_charities
  DROP CONSTRAINT IF EXISTS user_charities_contribution_percentage_check;

ALTER TABLE IF EXISTS user_charities
  ADD CONSTRAINT user_charities_pct_allowed CHECK (contribution_percentage IN (10,15,20,25,50));

-- Enforce one active charity per user (unique user_id ensures a single selection)
DO $$
BEGIN
  IF to_regclass('public.user_charities') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'user_charities_one_per_user'
         AND conrelid = 'public.user_charities'::regclass
     ) THEN
    ALTER TABLE user_charities ADD CONSTRAINT user_charities_one_per_user UNIQUE (user_id);
  END IF;
END$$;

-- Scores: enforce range and unique constraint (if not already present)
ALTER TABLE IF EXISTS scores
  ALTER COLUMN score SET DATA TYPE int USING score::int;

ALTER TABLE IF EXISTS scores
  DROP CONSTRAINT IF EXISTS scores_score_range_check;

ALTER TABLE IF EXISTS scores
  ADD CONSTRAINT scores_score_range_check CHECK (score BETWEEN 1 AND 45);

DO $$
BEGIN
  IF to_regclass('public.scores') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'scores_user_date_unique'
         AND conrelid = 'public.scores'::regclass
     ) THEN
    ALTER TABLE scores ADD CONSTRAINT scores_user_date_unique UNIQUE (user_id, score_date);
  END IF;
END$$;

-- Ensure updated_at trigger exists for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column_if_exists()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_if_exists();
