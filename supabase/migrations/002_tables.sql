-- 002_tables.sql
-- Create tables with constraints and foreign keys

-- profiles: link to auth.users(id)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'inactive',
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- charities
CREATE TABLE IF NOT EXISTS charities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  website text,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_charities
CREATE TABLE IF NOT EXISTS user_charities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  charity_id uuid NOT NULL,
  contribution_percentage int NOT NULL CHECK (contribution_percentage >= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_charities_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_charities_charity FOREIGN KEY (charity_id) REFERENCES charities(id) ON DELETE CASCADE,
  CONSTRAINT one_charity_per_user UNIQUE (user_id)
);

-- scores
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score int NOT NULL CHECK (score >= 1 AND score <= 45),
  score_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_scores_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_score_date UNIQUE (user_id, score_date)
);

-- Trigger to keep only latest 5 scores per user (canonical)
CREATE OR REPLACE FUNCTION keep_latest_five_scores() RETURNS trigger AS $$
BEGIN
  DELETE FROM scores
  WHERE id IN (
    SELECT id FROM scores
    WHERE user_id = NEW.user_id
    ORDER BY score_date DESC, created_at DESC
    OFFSET 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_keep_latest_five_scores
AFTER INSERT ON scores
FOR EACH ROW EXECUTE FUNCTION keep_latest_five_scores();

-- draws
CREATE TABLE IF NOT EXISTS draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_month date NOT NULL,
  mode draw_mode NOT NULL DEFAULT 'random',
  status draw_status NOT NULL DEFAULT 'draft',
  winning_numbers jsonb,
  jackpot_amount numeric(12,2) DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- draw_entries
CREATE TABLE IF NOT EXISTS draw_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL,
  user_id uuid NOT NULL,
  numbers jsonb NOT NULL,
  match_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_draw_entries_draw FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  CONSTRAINT fk_draw_entries_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- prize_pools
CREATE TABLE IF NOT EXISTS prize_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL,
  total_pool numeric(14,2) NOT NULL DEFAULT 0,
  pool_5_match numeric(14,2) NOT NULL DEFAULT 0,
  pool_4_match numeric(14,2) NOT NULL DEFAULT 0,
  pool_3_match numeric(14,2) NOT NULL DEFAULT 0,
  rollover_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_prize_pools_draw FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
);

-- winners
CREATE TABLE IF NOT EXISTS winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_entry_id uuid NOT NULL,
  draw_id uuid NOT NULL,
  user_id uuid NOT NULL,
  prize_amount numeric(14,2) NOT NULL DEFAULT 0,
  match_count int NOT NULL,
  status winner_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_winners_entry FOREIGN KEY (draw_entry_id) REFERENCES draw_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_winners_draw FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  CONSTRAINT fk_winners_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- winner_proofs
CREATE TABLE IF NOT EXISTS winner_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id uuid NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  CONSTRAINT fk_winner_proofs_winner FOREIGN KEY (winner_id) REFERENCES winners(id) ON DELETE CASCADE,
  CONSTRAINT fk_winner_proofs_reviewer FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- payouts
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_payouts_winner FOREIGN KEY (winner_id) REFERENCES winners(id) ON DELETE CASCADE
);

-- donations
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  charity_id uuid NOT NULL,
  subscription_id uuid,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_donations_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_donations_charity FOREIGN KEY (charity_id) REFERENCES charities(id) ON DELETE SET NULL,
  CONSTRAINT fk_donations_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL
);
