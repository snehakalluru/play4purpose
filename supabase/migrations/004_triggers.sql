-- 004_triggers.sql
-- Utility trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach update trigger to tables with updated_at
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles','subscriptions','charities','scores') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', tbl, tbl);
  END LOOP;
END$$;

-- Scores pruning: keep only latest 5 scores per user
CREATE OR REPLACE FUNCTION keep_latest_five_scores() RETURNS TRIGGER AS $$
BEGIN
  -- After inserting a new score, delete the oldest entries keeping latest 5 by score_date and created_at
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

DROP TRIGGER IF EXISTS trg_keep_latest_five_scores ON scores;
CREATE TRIGGER trg_keep_latest_five_scores
AFTER INSERT ON scores
FOR EACH ROW EXECUTE FUNCTION keep_latest_five_scores();
