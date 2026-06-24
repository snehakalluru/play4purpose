-- 021_production_admin_security_payments.sql
-- Final production hardening for auth.users identity, admin access, RLS, Stripe subscriptions, and payout tracking.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'user';

ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.app_role
  USING CASE WHEN role::text = 'admin' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user'::public.app_role,
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_auth_users_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_auth_users_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_auth_users_fkey;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_auth_users_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.user_charities
  DROP CONSTRAINT IF EXISTS user_charities_user_id_auth_users_fkey;

ALTER TABLE public.user_charities
  ADD CONSTRAINT user_charities_user_id_auth_users_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.winners
  DROP CONSTRAINT IF EXISTS winners_user_id_auth_users_fkey;

ALTER TABLE public.winners
  ADD CONSTRAINT winners_user_id_auth_users_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change profile roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation_trigger
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_end_value date := (now() + interval '14 days')::date;
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    subscription_status,
    trial_end,
    trial_end_date,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'user'::public.app_role,
    'trial_active',
    trial_end_value,
    trial_end_value,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = now();

  INSERT INTO public.subscriptions (
    user_id,
    status,
    is_trial,
    trial_end,
    trial_end_date,
    plan_type,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'trial_active',
    true,
    trial_end_value,
    trial_end_value,
    'monthly',
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_owner_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_or_admin" ON public.profiles;
CREATE POLICY profiles_select_owner_or_admin ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY profiles_insert_owner_or_admin ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY profiles_update_owner_or_admin ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS charities_read_active_or_admin ON public.charities;
DROP POLICY IF EXISTS charities_admin_all ON public.charities;
DROP POLICY IF EXISTS "charities_public_read" ON public.charities;
DROP POLICY IF EXISTS "charities_admin_write" ON public.charities;
CREATE POLICY charities_read_active_or_admin ON public.charities
  FOR SELECT USING (COALESCE(is_active, active, true) = true OR public.is_admin(auth.uid()));
CREATE POLICY charities_admin_all ON public.charities
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS user_charities_select_owner_or_admin ON public.user_charities;
DROP POLICY IF EXISTS user_charities_insert_owner_or_admin ON public.user_charities;
DROP POLICY IF EXISTS user_charities_update_admin ON public.user_charities;
DROP POLICY IF EXISTS user_charities_delete_admin ON public.user_charities;
DROP POLICY IF EXISTS "user_charities_owner_or_admin" ON public.user_charities;
CREATE POLICY user_charities_select_owner_or_admin ON public.user_charities
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY user_charities_insert_owner_or_admin ON public.user_charities
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY user_charities_update_admin ON public.user_charities
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY user_charities_delete_admin ON public.user_charities
  FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS subscriptions_select_owner_or_admin ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_admin_all ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_owner_or_admin" ON public.subscriptions;
CREATE POLICY subscriptions_select_owner_or_admin ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY subscriptions_admin_all ON public.subscriptions
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS draws_select_authenticated_or_admin ON public.draws;
DROP POLICY IF EXISTS draws_admin_all ON public.draws;
DROP POLICY IF EXISTS "draws_public_read" ON public.draws;
DROP POLICY IF EXISTS "draws_admin_write" ON public.draws;
CREATE POLICY draws_select_authenticated_or_admin ON public.draws
  FOR SELECT USING (auth.uid() IS NOT NULL OR public.is_admin(auth.uid()));
CREATE POLICY draws_admin_all ON public.draws
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS winners_select_owner_or_admin ON public.winners;
DROP POLICY IF EXISTS winners_admin_all ON public.winners;
DROP POLICY IF EXISTS "winners_select_owner_or_admin" ON public.winners;
DROP POLICY IF EXISTS "winners_admin_insert" ON public.winners;
DROP POLICY IF EXISTS "winners_admin_update" ON public.winners;
DROP POLICY IF EXISTS "winners_admin_delete" ON public.winners;
CREATE POLICY winners_select_owner_or_admin ON public.winners
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY winners_admin_all ON public.winners
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS payouts_select_owner_or_admin ON public.payouts;
DROP POLICY IF EXISTS payouts_admin_all ON public.payouts;
DROP POLICY IF EXISTS "payouts_select_owner_or_admin" ON public.payouts;
DROP POLICY IF EXISTS "payouts_admin_insert_update" ON public.payouts;
CREATE POLICY payouts_select_owner_or_admin ON public.payouts
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.winners w
      WHERE w.id = payouts.winner_id
        AND w.user_id = auth.uid()
    )
  );
CREATE POLICY payouts_admin_all ON public.payouts
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DO $$
BEGIN
  IF to_regclass('public.scores') IS NOT NULL THEN
    DROP POLICY IF EXISTS scores_owner_or_admin ON public.scores;
    DROP POLICY IF EXISTS "scores_owner_or_admin" ON public.scores;
    CREATE POLICY scores_owner_or_admin ON public.scores
      FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
      WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.draw_entries') IS NOT NULL THEN
    DROP POLICY IF EXISTS draw_entries_owner_or_admin ON public.draw_entries;
    DROP POLICY IF EXISTS "draw_entries_owner_or_admin" ON public.draw_entries;
    CREATE POLICY draw_entries_owner_or_admin ON public.draw_entries
      FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
      WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    DROP POLICY IF EXISTS notifications_owner_or_admin ON public.notifications;
    DROP POLICY IF EXISTS "notifications_owner_or_admin" ON public.notifications;
    CREATE POLICY notifications_owner_or_admin ON public.notifications
      FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
      WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS audit_logs_admin_all ON public.audit_logs;
    CREATE POLICY audit_logs_admin_all ON public.audit_logs
      FOR ALL USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.prize_pools') IS NOT NULL THEN
    DROP POLICY IF EXISTS prize_pools_authenticated_read ON public.prize_pools;
    DROP POLICY IF EXISTS prize_pools_admin_all ON public.prize_pools;
    CREATE POLICY prize_pools_authenticated_read ON public.prize_pools
      FOR SELECT USING (auth.uid() IS NOT NULL);
    CREATE POLICY prize_pools_admin_all ON public.prize_pools
      FOR ALL USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.donations') IS NOT NULL THEN
    DROP POLICY IF EXISTS donations_owner_or_admin ON public.donations;
    DROP POLICY IF EXISTS "donations_owner_or_admin" ON public.donations;
    CREATE POLICY donations_owner_or_admin ON public.donations
      FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
      WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
