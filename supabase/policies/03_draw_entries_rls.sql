-- Enable RLS on draw_entries
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own draw entries; admins can access all
CREATE POLICY "draw_entries_owner_or_admin" ON draw_entries
  FOR ALL
  USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
