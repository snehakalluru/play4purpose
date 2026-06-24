-- Trial registration support

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS privacy_accepted boolean DEFAULT false;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_end_date date,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trial_active';
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'inactive';
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'lapsed';
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'subscriptions'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%active%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trial_active', 'inactive', 'cancelled', 'canceled', 'past_due', 'expired', 'lapsed', 'incomplete'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_date ON subscriptions(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_reminder ON subscriptions(status, trial_end_date, trial_reminder_sent_at);
