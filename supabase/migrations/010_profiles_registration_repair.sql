-- 010_profiles_registration_repair.sql
-- Targeted repair for projects where registration fails because public.profiles
-- was never created or older migrations left it without registration columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  first_name text,
  last_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  email_verified boolean NOT NULL DEFAULT false,
  terms_accepted boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_email_unique'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

INSERT INTO profiles (id, email, full_name, first_name, last_name, role, email_verified)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', trim(concat(u.raw_user_meta_data ->> 'first_name', ' ', u.raw_user_meta_data ->> 'last_name'))),
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  'user',
  COALESCE(u.email_confirmed_at IS NOT NULL, false)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
