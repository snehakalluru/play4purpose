-- Admin System Setup
-- Run this migration to set up admin functionality

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER (No email confirmation needed)
-- ============================================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles: Users can read/update own profile
DROP POLICY IF EXISTS "profiles_owner_or_admin" ON profiles;
CREATE POLICY "profiles_owner_or_admin" ON profiles
  FOR ALL
  USING (auth.uid() = id OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

-- Scores: Users can insert/select own scores
DROP POLICY IF EXISTS "scores_owner_or_admin" ON scores;
CREATE POLICY "scores_owner_or_admin" ON scores
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Draws: Public read, admin write
DROP POLICY IF EXISTS "draws_public_read" ON draws;
CREATE POLICY "draws_public_read" ON draws
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "draws_admin_write" ON draws;
CREATE POLICY "draws_admin_write" ON draws
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Winners: Users can read their own, admin full access
DROP POLICY IF EXISTS "winners_select_owner_or_admin" ON winners;
CREATE POLICY "winners_select_owner_or_admin" ON winners
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "winners_admin_insert" ON winners;
CREATE POLICY "winners_admin_insert" ON winners
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Draw entries: Users can read own, admin full access
DROP POLICY IF EXISTS "draw_entries_owner_or_admin" ON draw_entries;
CREATE POLICY "draw_entries_owner_or_admin" ON draw_entries
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- User charities: Users can manage own, admin full access
DROP POLICY IF EXISTS "user_charities_owner_or_admin" ON user_charities;
CREATE POLICY "user_charities_owner_or_admin" ON user_charities
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- Notifications: Users can read own, admin full access
DROP POLICY IF EXISTS "notifications_owner_or_admin" ON notifications;
CREATE POLICY "notifications_owner_or_admin" ON notifications
  FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- ============================================================
-- DISABLE EMAIL CONFIRMATION REQUIREMENT
-- ============================================================

-- Update auth settings to not require email confirmation
-- This is done via Supabase Dashboard: Authentication → Settings → Email Auth
-- Uncheck "Confirm email" option

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant authenticated users permission to use the handle_new_user function
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON scores TO authenticated;
GRANT ALL ON draw_entries TO authenticated;
GRANT ALL ON user_charities TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- Grant read access to draws and winners
GRANT SELECT ON draws TO authenticated;
GRANT SELECT ON winners TO authenticated;