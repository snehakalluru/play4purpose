-- 003_indexes.sql
-- Create indexes to support common queries and foreign key lookups

-- Profiles: lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
-- Explain: quick lookup by email for auth flows and admin lookups.

-- Subscriptions: queries by user_id and stripe ids
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
-- Explain: used when validating user subscription and webhook syncs.

-- Charities: search by slug and active/featured flags
CREATE INDEX IF NOT EXISTS idx_charities_slug ON charities(slug);
CREATE INDEX IF NOT EXISTS idx_charities_active ON charities(active);

-- User charities: lookup by user and charity
CREATE INDEX IF NOT EXISTS idx_user_charities_user_id ON user_charities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_charities_charity_id ON user_charities(charity_id);

-- Scores: frequent lookups by user and date ranges
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_date ON scores(score_date);
-- Explain: used for leaderboard, recent scores, and pruning logic.

-- Draw entries and winners
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON winners(user_id);

-- Prize pools: frequently queried by draw
CREATE INDEX IF NOT EXISTS idx_prize_pools_draw_id ON prize_pools(draw_id);

-- Donations: queries by user and charity
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON donations(charity_id);

-- Audit logs: common queries by actor and entity
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
