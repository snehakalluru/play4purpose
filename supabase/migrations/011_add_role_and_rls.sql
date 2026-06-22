-- Add role column to profiles and RLS policies for admin access
BEGIN;

-- Add role column (default 'user')
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Ensure role column not null (optional)
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';

-- Enable RLS if not already
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Admins can select/insert/update/delete on profiles
CREATE POLICY IF NOT EXISTS "profiles_admin_full_access" ON profiles
  FOR ALL
  USING ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ))
  WITH CHECK ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ));

-- For other tables, restrict admin-only access via explicit policies
-- Example: draws table full access for admins
ALTER TABLE IF EXISTS draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "draws_admin_access" ON draws
  FOR ALL
  USING ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ))
  WITH CHECK ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ));

ALTER TABLE IF EXISTS winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "winners_admin_access" ON winners
  FOR ALL
  USING ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ))
  WITH CHECK ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ));

ALTER TABLE IF EXISTS payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "payouts_admin_access" ON payouts
  FOR ALL
  USING ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ))
  WITH CHECK ( auth.role() = 'service_role' OR (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ));

COMMIT;
