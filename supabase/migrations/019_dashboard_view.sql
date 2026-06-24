-- 019_dashboard_view.sql
-- Joined dashboard projection to prevent null user state in the UI.

CREATE OR REPLACE VIEW public.user_dashboard_view AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.phone,
  p.role,
  p.charity_id AS profile_charity_id,
  p.contribution_percentage AS profile_contribution_percentage,
  p.subscription_status AS profile_subscription_status,
  p.trial_end_date AS profile_trial_end_date,
  p.privacy_accepted,
  p.terms_accepted,
  p.created_at AS profile_created_at,
  s.id AS subscription_id,
  s.plan_type,
  s.status AS subscription_status,
  s.is_trial,
  s.trial_end_date AS subscription_trial_end_date,
  s.renewal_date,
  s.started_at,
  s.expires_at,
  s.current_period_start,
  s.current_period_end,
  uc.id AS user_charity_id,
  uc.charity_id AS selected_charity_id,
  uc.contribution_percentage AS selected_contribution_percentage,
  uc.created_at AS user_charity_created_at,
  uc.charity_name,
  uc.charity_description,
  uc.charity_active,
  uc.charity_image_url,
  uc.charity_logo_url
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT *
  FROM public.subscriptions s
  WHERE s.user_id = p.id
  ORDER BY s.created_at DESC
  LIMIT 1
) s ON true
LEFT JOIN LATERAL (
  SELECT
    uc.id,
    uc.user_id,
    uc.charity_id,
    uc.contribution_percentage,
    uc.created_at,
    c.name AS charity_name,
    c.description AS charity_description,
    c.active AS charity_active,
    c.image_url AS charity_image_url,
    c.logo_url AS charity_logo_url
  FROM public.user_charities uc
  LEFT JOIN public.charities c ON c.id = uc.charity_id
  WHERE uc.user_id = p.id
  ORDER BY uc.created_at DESC
  LIMIT 1
) uc ON true
;
