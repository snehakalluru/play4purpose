-- 010_full_schema.sql
-- Complete schema matching the prize draw specification.
-- Run after enums (001_enums.sql) and before this if not already applied.

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  charity_id uuid,
  contribution_percentage numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- charities
CREATE TABLE IF NOT EXISTS charities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  website text,
  logo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan_type subscription_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- scores (40-200 range per spec)
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 40 AND score <= 200),
  played_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_played_date UNIQUE (user_id, played_date)
);

-- score_statistics (rolling averages)
CREATE TABLE IF NOT EXISTS score_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rolling_average numeric DEFAULT 0,
  last_five_average numeric DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_stats UNIQUE (user_id)
);

-- draws
CREATE TABLE IF NOT EXISTS draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  draw_date date NOT NULL,
  status draw_status NOT NULL DEFAULT 'draft',
  prize_pool numeric(12,2) DEFAULT 0,
  jackpot_amount numeric(12,2) DEFAULT 0,
  second_prize numeric(12,2) DEFAULT 0,
  third_prize numeric(12,2) DEFAULT 0,
  winning_number text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- draw_entries
CREATE TABLE IF NOT EXISTS draw_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_draw_user_entry UNIQUE (draw_id, user_id)
);

-- winners
CREATE TABLE IF NOT EXISTS winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  verification_status winner_status NOT NULL DEFAULT 'pending',
  payment_status payout_status NOT NULL DEFAULT 'pending',
  proof_url text,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- payouts
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id uuid NOT NULL REFERENCES winners(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  payment_method text,
  transaction_reference text,
  status payout_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- prize_pools
CREATE TABLE IF NOT EXISTS prize_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  total_pool numeric(14,2) NOT NULL DEFAULT 0,
  jackpot_amount numeric(14,2) NOT NULL DEFAULT 0,
  second_amount numeric(14,2) NOT NULL DEFAULT 0,
  third_amount numeric(14,2) NOT NULL DEFAULT 0,
  rollover_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- user_charities
CREATE TABLE IF NOT EXISTS user_charities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  charity_id uuid NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  contribution_percentage int NOT NULL DEFAULT 10 CHECK (contribution_percentage IN (0, 5, 10, 15, 20)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_charity_per_user UNIQUE (user_id)
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_played_date ON scores(played_date);
CREATE INDEX IF NOT EXISTS idx_scores_user_date ON scores(user_id, played_date DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON winners(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_charities_user_id ON user_charities(user_id);
CREATE INDEX IF NOT EXISTS idx_draws_status ON draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON draws(draw_date DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_score_statistics_updated_at BEFORE UPDATE ON score_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate and update rolling average after score insert
CREATE OR REPLACE FUNCTION update_score_statistics()
RETURNS trigger AS $$
DECLARE
  avg_score numeric;
BEGIN
  SELECT ROUND(AVG(score), 1) INTO avg_score
  FROM (
    SELECT score FROM scores
    WHERE user_id = NEW.user_id
    ORDER BY played_date DESC
    LIMIT 5
  ) latest;
  
  INSERT INTO score_statistics (user_id, rolling_average, last_five_average, updated_at)
  VALUES (NEW.user_id, COALESCE(avg_score, 0), COALESCE(avg_score, 0), now())
  ON CONFLICT (user_id)
  DO UPDATE SET rolling_average = COALESCE(avg_score, 0),
                last_five_average = COALESCE(avg_score, 0),
                updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_score_stats
AFTER INSERT ON scores
FOR EACH ROW EXECUTE FUNCTION update_score_statistics();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS score_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Admin check helper
CREATE OR REPLACE FUNCTION is_admin(uid uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Profiles
DROP POLICY IF EXISTS "profiles_owner_or_admin" ON profiles;
CREATE POLICY "profiles_owner_or_admin" ON profiles
  FOR ALL
  USING (auth.uid() = id OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

-- Scores
DROP POLICY IF EXISTS "scores_owner_or_admin" ON scores;
CREATE POLICY "scores_owner_or_admin" ON scores
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Score statistics
DROP POLICY IF EXISTS "score_stats_owner_or_admin" ON score_statistics;
CREATE POLICY "score_stats_owner_or_admin" ON score_statistics
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Subscriptions
DROP POLICY IF EXISTS "subscriptions_owner_or_admin" ON subscriptions;
CREATE POLICY "subscriptions_owner_or_admin" ON subscriptions
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Draw entries
DROP POLICY IF EXISTS "draw_entries_owner_or_admin" ON draw_entries;
CREATE POLICY "draw_entries_owner_or_admin" ON draw_entries
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Winners
DROP POLICY IF EXISTS "winners_select_owner_or_admin" ON winners;
CREATE POLICY "winners_select_owner_or_admin" ON winners
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "winners_admin_insert" ON winners;
CREATE POLICY "winners_admin_insert" ON winners
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "winners_admin_update" ON winners;
CREATE POLICY "winners_admin_update" ON winners
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- User charities
DROP POLICY IF EXISTS "user_charities_owner_or_admin" ON user_charities;
CREATE POLICY "user_charities_owner_or_admin" ON user_charities
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Notifications
DROP POLICY IF EXISTS "notifications_owner_or_admin" ON notifications;
CREATE POLICY "notifications_owner_or_admin" ON notifications
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- ============================================================
-- SEED DATA
-- ============================================================

-- Create an admin profile (replace with your actual auth user id after setup)
INSERT INTO profiles (id, email, full_name, role) 
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@play4purpose.com', 'Admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Seed charities
INSERT INTO charities (id, name, description, active) VALUES
  (gen_random_uuid(), 'Make-A-Wish Foundation', 'Grants wishes for children with critical illnesses', true),
  (gen_random_uuid(), 'St. Jude Children''s Research Hospital', 'Leading the way in treating childhood cancer', true),
  (gen_random_uuid(), 'World Wildlife Fund', 'Protecting endangered species and wild places', true),
  (gen_random_uuid(), 'American Red Cross', 'Emergency response and disaster relief', true),
  (gen_random_uuid(), 'Doctors Without Borders', 'Medical care in crisis zones worldwide', true)
ON CONFLICT DO NOTHING;
