-- 007_seed.sql
-- Seed data for Play4Purpose
-- NOTE: profiles.id references auth.users(id). Ensure corresponding auth users are created via Supabase Auth admin before running this seed, or adapt IDs accordingly.

-- Create admin profile (ensure auth user exists with same id)
INSERT INTO profiles (id, email, first_name, last_name, role)
VALUES
  ('00000000-0000-0000-0000-000000000001','admin@play4purpose.test','Site','Admin','admin')
ON CONFLICT (id) DO NOTHING;

-- Charities
INSERT INTO charities (id, name, slug, description, featured, active)
VALUES
  (gen_random_uuid(), 'Golf Relief Foundation', 'golf-relief', 'Helping communities through golf.', true, true),
  (gen_random_uuid(), 'Fair Play Charities', 'fair-play', 'Youth sports and education.', true, true),
  (gen_random_uuid(), 'Greens for Good', 'greens-good', 'Environmental stewardship projects.', false, true),
  (gen_random_uuid(), 'Swing for Hope', 'swing-hope', 'Cancer support programs.', false, true),
  (gen_random_uuid(), 'Tee Off Tomorrow', 'tee-off', 'Junior golf scholarships.', false, true)
ON CONFLICT (slug) DO NOTHING;

-- Sample subscriptions (attach to admin profile and placeholders)
INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, started_at, expires_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'cus_admin_1', 'sub_admin_1', 'monthly', 'active', now(), now() + interval '30 days')
ON CONFLICT DO NOTHING;

-- Sample scores for a test user
INSERT INTO profiles (id, email, first_name, last_name)
VALUES
  ('11111111-1111-1111-1111-111111111111','player1@play4purpose.test','Player','One')
ON CONFLICT (id) DO NOTHING;

INSERT INTO scores (id, user_id, score, score_date)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 36, now()::date - interval '1 day'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 38, now()::date - interval '5 day'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 34, now()::date - interval '10 day')
ON CONFLICT DO NOTHING;

-- Sample draw
INSERT INTO draws (id, draw_month, mode, status, winning_numbers, jackpot_amount, published_at)
VALUES
  (gen_random_uuid(), date_trunc('month', now())::date, 'random', 'published', '["3","12","18","24","33"]'::jsonb, 10000.00, now())
ON CONFLICT DO NOTHING;

-- Link prize pool to draw
WITH d AS (SELECT id FROM draws ORDER BY created_at DESC LIMIT 1)
INSERT INTO prize_pools (draw_id, total_pool, pool_5_match, pool_4_match, pool_3_match, rollover_amount)
SELECT d.id, 10000.00, 5000.00, 3000.00, 2000.00, 0.00 FROM d
ON CONFLICT DO NOTHING;

-- Sample draw entry and winner for player1
WITH draw_row AS (SELECT id FROM draws ORDER BY created_at DESC LIMIT 1), p AS (SELECT id FROM profiles WHERE email = 'player1@play4purpose.test' LIMIT 1)
INSERT INTO draw_entries (id, draw_id, user_id, numbers, match_count)
SELECT gen_random_uuid(), d.id, p.id, '["3","12","18","24","33"]'::jsonb, 5 FROM draw_row d, p
ON CONFLICT DO NOTHING;

-- Create winner record for above entry
WITH e AS (SELECT id, draw_id, user_id FROM draw_entries ORDER BY created_at DESC LIMIT 1)
INSERT INTO winners (draw_entry_id, draw_id, user_id, prize_amount, match_count, status)
SELECT e.id, e.draw_id, e.user_id, 5000.00, 5, 'approved' FROM e
ON CONFLICT DO NOTHING;

-- Sample donation
INSERT INTO donations (id, user_id, charity_id, subscription_id, amount)
SELECT gen_random_uuid(), p.id, c.id, s.id, 10.00
FROM (SELECT id FROM profiles WHERE email = 'player1@play4purpose.test' LIMIT 1) p,
     (SELECT id FROM charities WHERE active = true LIMIT 1) c,
     (SELECT id FROM subscriptions WHERE user_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) s
ON CONFLICT DO NOTHING;
