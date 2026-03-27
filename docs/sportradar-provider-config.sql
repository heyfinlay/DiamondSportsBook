-- Apply after deploying the edge function.
-- This version intentionally enables only Formula 1 and Rugby League for the
-- first rollout. AFL, MMA, and soccer stay disabled until you explicitly widen
-- the ingestion scope.

UPDATE public.sports_providers
SET config = jsonb_build_object(
  'access_level', 'trial',
  'language_code', 'en',
  'request_budget', jsonb_build_object(
    'soft_monthly_limit', 900,
    'per_run_request_cap', 16,
    'live_detail_cap', 3,
    'schedule_days_ahead', 5,
    'schedule_days_back', 1
  ),
  'sports', jsonb_build_object(
    'f1', jsonb_build_object(
      'enabled', true,
      'allowed_competition_names', jsonb_build_array('Formula 1'),
      'schedule_days_ahead', 14,
      'schedule_days_back', 2,
      'live_detail_cap', 2
    ),
    'nrl', jsonb_build_object(
      'enabled', true,
      'package', 'league',
      'allowed_competition_names', jsonb_build_array('NRL', 'National Rugby League'),
      'schedule_days_ahead', 7,
      'schedule_days_back', 1
    ),
    'afl', jsonb_build_object(
      'enabled', false,
      'allowed_competition_names', jsonb_build_array('AFL', 'Australian Football League'),
      'schedule_days_ahead', 7,
      'schedule_days_back', 1
    ),
    'mma', jsonb_build_object(
      'enabled', false,
      'allowed_competition_names', jsonb_build_array('UFC', 'Ultimate Fighting Championship'),
      'schedule_days_ahead', 14,
      'schedule_days_back', 3
    ),
    'soccer', jsonb_build_object(
      'enabled', false,
      'allowed_competition_names', jsonb_build_array(
        'A-League',
        'Premier League'
      ),
      'schedule_days_ahead', 4,
      'schedule_days_back', 1
    )
  )
)
WHERE provider_key = 'sportradar';

-- When you are ready to expand:
-- 1. flip `enabled` to true for AFL, MMA, or soccer
-- 2. keep `allowed_competition_names` tight
-- 3. consider raising `per_run_request_cap` only after observing usage
