-- Enable RLS on winners
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Users can view their own winner records; admins can access all
CREATE POLICY "winners_owner_or_admin" ON winners
  FOR SELECT
  USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins only can insert/update/delete winners (prevent users from creating winners)
DROP POLICY IF EXISTS "winners_admin_only_insert" ON winners;
CREATE POLICY "winners_admin_only_insert" ON winners
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "winners_admin_only_update" ON winners;
CREATE POLICY "winners_admin_only_update" ON winners
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "winners_admin_only_delete" ON winners;
CREATE POLICY "winners_admin_only_delete" ON winners
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
