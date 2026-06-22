-- Fix missing columns, tables, and enums

-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'past_due', 'canceled', 'in_grace_period');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE draw_status AS ENUM ('draft', 'scheduled', 'running', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE winner_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update existing columns to use enums
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE subscriptions ALTER COLUMN plan_type TYPE subscription_plan USING plan_type::subscription_plan;
ALTER TABLE subscriptions ALTER COLUMN status TYPE subscription_status USING status::subscription_status;
ALTER TABLE draws ALTER COLUMN status TYPE draw_status USING status::draw_status;
ALTER TABLE winners ALTER COLUMN verification_status TYPE winner_status USING verification_status::winner_status;
ALTER TABLE winners ALTER COLUMN payment_status TYPE payout_status USING payment_status::payout_status;

-- Create winner_proofs table
CREATE TABLE IF NOT EXISTS winner_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id uuid NOT NULL REFERENCES winners(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create donations table (for charity contributions)
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  charity_id uuid NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for new tables
ALTER TABLE winner_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Winner proofs policies
DROP POLICY IF EXISTS "winner_proofs_admin_all" ON winner_proofs;
CREATE POLICY "winner_proofs_admin_all" ON winner_proofs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Donations policies
DROP POLICY IF EXISTS "donations_owner_or_admin" ON donations;
CREATE POLICY "donations_owner_or_admin" ON donations
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_winner_proofs_winner_id ON winner_proofs(winner_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON donations(charity_id);

-- Function to calculate prize distribution
CREATE OR REPLACE FUNCTION calculate_prize_distribution(draw_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  pool record;
  winners_5_match numeric;
  winners_4_match numeric;
  winners_3_match numeric;
  count_5 integer;
  count_4 integer;
  count_3 integer;
  result jsonb;
BEGIN
  SELECT * INTO pool FROM prize_pools WHERE draw_id = draw_uuid;
  
  SELECT COUNT(*) INTO count_5_match FROM winners WHERE draw_id = draw_uuid AND match_count = 5;
  SELECT COUNT(*) INTO count_4_match FROM winners WHERE draw_id = draw_uuid AND match_count = 4;
  SELECT COUNT(*) INTO count_3_match FROM winners WHERE draw_id = draw_uuid AND match_count = 3;
  
  IF count_5_match > 0 THEN
    winners_5_match := ROUND((pool.pool_5_match / count_5_match)::numeric, 2);
    UPDATE winners SET prize_amount = winners_5_match WHERE draw_id = draw_uuid AND match_count = 5;
  END IF;
  
  IF count_4_match > 0 THEN
    winners_4_match := ROUND((pool.pool_4_match / count_4_match)::numeric, 2);
    UPDATE winners SET prize_amount = winners_4_match WHERE draw_id = draw_uuid AND match_count = 4;
  END IF;
  
  IF count_3_match > 0 THEN
    winners_3_match := ROUND((pool.pool_3_match / count_3_match)::numeric, 2);
    UPDATE winners SET prize_amount = winners_3_match WHERE draw_id = draw_uuid AND match_count = 3;
  END IF;
  
  result := jsonb_build_object(
    'allocations', jsonb_build_object(
      '5_match', winners_5_match,
      '4_match', winners_4_match,
      '3_match', winners_3_match
    ),
    'rollover', 0
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get eligible draw users
CREATE OR REPLACE FUNCTION get_eligible_draw_users()
RETURNS TABLE(user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.user_id
  FROM subscriptions s
  INNER JOIN user_charities uc ON s.user_id = uc.user_id
  INNER JOIN (
    SELECT user_id, COUNT(*) as score_count
    FROM scores
    GROUP BY user_id
    HAVING COUNT(*) >= 5
  ) sc ON s.user_id = sc.user_id
  WHERE s.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE;