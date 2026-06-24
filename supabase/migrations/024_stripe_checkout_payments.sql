-- 024_stripe_checkout_payments.sql
-- Stores one-time Stripe Checkout payment state idempotently.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS amount_paid integer,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS payment_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_stripe_session_id_key'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status
  ON public.subscriptions(status, user_id);
