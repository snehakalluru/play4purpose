-- Enable RLS on winners
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Users can view their own winner records; admins can access all
CREATE POLICY "winners_owner_or_admin" ON winners
  FOR SELECT
  USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins only can insert/update/delete winners (prevent users from creating winners)
CREATE POLICY "winners_admin_only_modifications" ON winners
  FOR INSERT, UPDATE, DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
