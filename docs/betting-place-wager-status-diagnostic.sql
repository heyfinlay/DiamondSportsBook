-- ============================================================================
-- Diagnostic Script: betting_place_wager 400 Error Investigation
-- ============================================================================
--
-- Symptom: Some pools accept wagers, others return HTTP 400
-- Pools failing: "Race Overall Winner", "First Retirement"
-- Pools working: "Qualifying Pole Position", "Fastest Lap"
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Check pool statuses
-- ============================================================================

SELECT
  m.id AS pool_id,
  m.name AS pool_name,
  m.status AS pool_status,
  m.close_time,
  m.min_stake,
  m.max_stake,
  m.total_pool,
  e.id AS event_id,
  e.title AS event_title,
  e.status AS event_status,
  COUNT(o.id) AS outcome_count
FROM public.markets m
JOIN public.events e ON e.id = m.event_id
LEFT JOIN public.outcomes o ON o.market_id = m.id
WHERE m.archived IS NOT TRUE
GROUP BY m.id, m.name, m.status, m.close_time, m.min_stake, m.max_stake, m.total_pool, e.id, e.title, e.status
ORDER BY e.created_at DESC, m.name;

-- Expected result: Check if failing pools have status != 'open'


-- ============================================================================
-- STEP 2: Check outcomes for each pool
-- ============================================================================

SELECT
  m.name AS pool_name,
  m.status AS pool_status,
  o.id AS outcome_id,
  o.label AS outcome_label,
  o.pool AS outcome_pool,
  o.market_id
FROM public.markets m
LEFT JOIN public.outcomes o ON o.market_id = m.id
WHERE m.archived IS NOT TRUE
ORDER BY m.name, o.label;

-- Expected result: Verify outcomes are linked to correct markets


-- ============================================================================
-- STEP 3: Identify pools with status != 'open'
-- ============================================================================

SELECT
  m.id AS pool_id,
  m.name AS pool_name,
  m.status AS current_status,
  CASE
    WHEN m.status = 'open' THEN '✅ Ready for wagers'
    WHEN m.status = 'draft' THEN '❌ Needs to be opened (status=draft)'
    WHEN m.status = 'closed' THEN '❌ Pool closed'
    WHEN m.status = 'settled' THEN '❌ Pool settled'
    WHEN m.status = 'suspended' THEN '❌ Pool suspended'
    ELSE '❌ Unknown status'
  END AS wager_readiness,
  m.close_time,
  now() > COALESCE(m.close_time, now() + interval '100 years') AS is_past_close_time
FROM public.markets m
WHERE m.archived IS NOT TRUE
ORDER BY m.name;


-- ============================================================================
-- STEP 4: Check for specific pool names mentioned in the issue
-- ============================================================================

SELECT
  m.id AS pool_id,
  m.name AS pool_name,
  m.status AS pool_status,
  CASE
    WHEN m.name LIKE '%Overall Winner%' THEN 'FAILING POOL ❌'
    WHEN m.name LIKE '%First Retirement%' THEN 'FAILING POOL ❌'
    WHEN m.name LIKE '%Pole Position%' THEN 'WORKING POOL ✅'
    WHEN m.name LIKE '%Fastest Lap%' THEN 'WORKING POOL ✅'
    ELSE 'OTHER'
  END AS pool_category,
  COUNT(o.id) AS outcome_count
FROM public.markets m
LEFT JOIN public.outcomes o ON o.market_id = m.id
WHERE
  m.name LIKE '%Overall Winner%'
  OR m.name LIKE '%First Retirement%'
  OR m.name LIKE '%Pole Position%'
  OR m.name LIKE '%Fastest Lap%'
GROUP BY m.id, m.name, m.status
ORDER BY m.name;


-- ============================================================================
-- STEP 5: Get detailed error conditions for each pool
-- ============================================================================

SELECT
  m.id AS pool_id,
  m.name AS pool_name,
  m.status AS pool_status,
  -- Error condition checks (from betting_preview_wager function)
  CASE WHEN m.id IS NULL THEN '❌ Pool not found' ELSE '✅ Pool exists' END AS check_pool_exists,
  CASE WHEN m.status <> 'open' THEN '❌ Pool is not open (current: ' || m.status || ')' ELSE '✅ Pool is open' END AS check_status,
  CASE WHEN now() > COALESCE(m.close_time, now() + interval '100 years') THEN '❌ Pool closed' ELSE '✅ Not past close time' END AS check_close_time,
  CASE WHEN m.min_stake IS NULL OR m.max_stake IS NULL THEN '❌ Stake limits not set' ELSE '✅ Stake limits set (' || m.min_stake || ' - ' || m.max_stake || ')' END AS check_stake_limits,
  CASE WHEN NOT EXISTS (SELECT 1 FROM public.outcomes WHERE market_id = m.id) THEN '❌ No outcomes' ELSE '✅ Has outcomes' END AS check_outcomes
FROM public.markets m
WHERE m.archived IS NOT TRUE
ORDER BY m.name;


-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

-- Run this to get a quick summary:
WITH pool_validation AS (
  SELECT
    m.id,
    m.name,
    m.status,
    m.status = 'open' AS is_open,
    now() <= COALESCE(m.close_time, now() + interval '100 years') AS not_closed,
    EXISTS (SELECT 1 FROM public.outcomes WHERE market_id = m.id) AS has_outcomes,
    m.status = 'open'
      AND now() <= COALESCE(m.close_time, now() + interval '100 years')
      AND EXISTS (SELECT 1 FROM public.outcomes WHERE market_id = m.id)
    AS can_accept_wagers
  FROM public.markets m
  WHERE m.archived IS NOT TRUE
)
SELECT
  COUNT(*) FILTER (WHERE can_accept_wagers) AS pools_ready_for_wagers,
  COUNT(*) FILTER (WHERE NOT can_accept_wagers) AS pools_not_ready,
  COUNT(*) FILTER (WHERE NOT is_open) AS pools_wrong_status,
  COUNT(*) FILTER (WHERE NOT not_closed) AS pools_past_close_time,
  COUNT(*) FILTER (WHERE NOT has_outcomes) AS pools_no_outcomes
FROM pool_validation;
