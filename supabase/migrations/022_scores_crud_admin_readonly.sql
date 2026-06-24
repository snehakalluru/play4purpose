-- 022_scores_crud_admin_readonly.sql
-- Scores are full-history user records. Users can manage their own rows;
-- admins can view all rows but cannot modify scores through RLS.

DROP TRIGGER IF EXISTS trg_keep_latest_five_scores ON public.scores;
DROP FUNCTION IF EXISTS public.keep_latest_five_scores();

CREATE INDEX IF NOT EXISTS idx_scores_user_score_date
  ON public.scores(user_id, score_date DESC, created_at DESC);

ALTER TABLE IF EXISTS public.scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scores_owner_or_admin ON public.scores;
DROP POLICY IF EXISTS "scores_owner_or_admin" ON public.scores;
DROP POLICY IF EXISTS scores_select_owner_or_admin ON public.scores;
DROP POLICY IF EXISTS scores_insert_owner ON public.scores;
DROP POLICY IF EXISTS scores_update_owner ON public.scores;
DROP POLICY IF EXISTS scores_delete_owner ON public.scores;

CREATE POLICY scores_select_owner_or_admin ON public.scores
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY scores_insert_owner ON public.scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY scores_update_owner ON public.scores
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY scores_delete_owner ON public.scores
  FOR DELETE USING (auth.uid() = user_id);
