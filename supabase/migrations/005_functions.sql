-- 005_functions.sql
-- Helper functions used by RLS policies and business logic

-- is_admin(user_uuid uuid) RETURNS boolean
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid) RETURNS boolean AS $$
DECLARE
  r boolean := false;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN false;
  END IF;
  SELECT (role = 'admin') INTO r FROM profiles WHERE id = user_uuid LIMIT 1;
  RETURN COALESCE(r, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- get_user_active_subscription(user_uuid uuid) RETURNS subscriptions row as JSON
CREATE OR REPLACE FUNCTION get_user_active_subscription(user_uuid uuid)
RETURNS TABLE(id uuid, stripe_subscription_id text, plan subscription_plan, status subscription_status, started_at timestamptz, expires_at timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.stripe_subscription_id, s.plan, s.status, s.started_at, s.expires_at
  FROM subscriptions s
  WHERE s.user_id = user_uuid AND s.status = 'active'
  ORDER BY s.expires_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- calculate_match_count(numbers jsonb, winning_numbers jsonb) RETURNS int
CREATE OR REPLACE FUNCTION calculate_match_count(numbers jsonb, winning_numbers jsonb) RETURNS int AS $$
DECLARE
  cnt int := 0;
BEGIN
  IF numbers IS NULL OR winning_numbers IS NULL THEN
    RETURN 0;
  END IF;
  RETURN (
    SELECT count(*) FROM (
      SELECT n.val FROM (SELECT jsonb_array_elements_text(numbers) AS val) n
      INNER JOIN (SELECT jsonb_array_elements_text(winning_numbers) AS val) w ON n.val = w.val
    ) sub
  );
END;
$$ LANGUAGE sql IMMUTABLE;

-- calculate_prize_distribution(draw_uuid uuid) RETURNS jsonb
-- Returns distribution per match tier and rollover adjustments
CREATE OR REPLACE FUNCTION calculate_prize_distribution(draw_uuid uuid) RETURNS jsonb AS $$
DECLARE
  pool_row record;
  counts record;
  res jsonb;
  alloc_5 numeric := 0;
  alloc_4 numeric := 0;
  alloc_3 numeric := 0;
BEGIN
  SELECT * INTO pool_row FROM prize_pools WHERE draw_id = draw_uuid LIMIT 1;
  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT
    SUM(CASE WHEN match_count = 5 THEN 1 ELSE 0 END) AS cnt5,
    SUM(CASE WHEN match_count = 4 THEN 1 ELSE 0 END) AS cnt4,
    SUM(CASE WHEN match_count = 3 THEN 1 ELSE 0 END) AS cnt3
  INTO counts
  FROM winners WHERE draw_id = draw_uuid AND status = 'approved';

  IF counts.cnt5 > 0 THEN
    alloc_5 := pool_row.pool_5_match / counts.cnt5;
  ELSE
    pool_row.rollover_amount := pool_row.rollover_amount + pool_row.pool_5_match;
  END IF;

  IF counts.cnt4 > 0 THEN
    alloc_4 := pool_row.pool_4_match / counts.cnt4;
  ELSE
    pool_row.rollover_amount := pool_row.rollover_amount + pool_row.pool_4_match;
  END IF;

  IF counts.cnt3 > 0 THEN
    alloc_3 := pool_row.pool_3_match / counts.cnt3;
  ELSE
    pool_row.rollover_amount := pool_row.rollover_amount + pool_row.pool_3_match;
  END IF;

  res := jsonb_build_object(
    'total_pool', pool_row.total_pool,
    'allocations', jsonb_build_object(
      '5_match', alloc_5,
      '4_match', alloc_4,
      '3_match', alloc_3
    ),
    'rollover', pool_row.rollover_amount
  );

  RETURN res;
END;
$$ LANGUAGE plpgsql STABLE;
