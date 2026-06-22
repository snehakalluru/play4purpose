-- 006_rls.sql
-- Enable Row Level Security and add policies

-- Enable RLS for all user-facing tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_charities ENABLE ROW LEVEL SECURITY;

-- Helper expression for admin check
-- Note: auth.uid() is provided by Supabase JWT context

-- Profiles: users can manage own profile; admins can access all
DROP POLICY IF EXISTS "profiles_owner_or_admin" ON profiles;
CREATE POLICY "profiles_owner_or_admin" ON profiles
  FOR ALL
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Scores: users can CRUD their own scores; admins can access all
DROP POLICY IF EXISTS "scores_owner_or_admin" ON scores;
CREATE POLICY "scores_owner_or_admin" ON scores
  FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Subscriptions: users can view their own subscription; admins can access all
DROP POLICY IF EXISTS "subscriptions_owner_or_admin" ON subscriptions;
CREATE POLICY "subscriptions_owner_or_admin" ON subscriptions
  FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Draw entries: users can manage their own entries; admins can access all
DROP POLICY IF EXISTS "draw_entries_owner_or_admin" ON draw_entries;
CREATE POLICY "draw_entries_owner_or_admin" ON draw_entries
  FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Winners: users can view their own winner rows; only admins can insert/update/delete
DROP POLICY IF EXISTS "winners_select_owner_or_admin" ON winners;
CREATE POLICY "winners_select_owner_or_admin" ON winners
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "winners_admin_insert" ON winners;
CREATE POLICY "winners_admin_insert" ON winners
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "winners_admin_update" ON winners;
CREATE POLICY "winners_admin_update" ON winners
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "winners_admin_delete" ON winners;
CREATE POLICY "winners_admin_delete" ON winners
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Donations: users can CRUD their own donations; admins can access all
DROP POLICY IF EXISTS "donations_owner_or_admin" ON donations;
CREATE POLICY "donations_owner_or_admin" ON donations
  FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- User charities: only allow users to manage their own charity selection; admins allowed
DROP POLICY IF EXISTS "user_charities_owner_or_admin" ON user_charities;
CREATE POLICY "user_charities_owner_or_admin" ON user_charities
  FOR ALL
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
