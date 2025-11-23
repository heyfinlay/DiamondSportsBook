-- ============================================================================
-- Fix Pool Status to Enable Wagers
-- ============================================================================
--
-- Issue: betting_place_wager returns HTTP 400 for some pools
-- Root cause: Pools have status != 'open'
--
-- The betting_preview_wager function (called by betting_place_wager) checks:
--   IF pool_row.status <> 'open' THEN
--     RAISE EXCEPTION 'Pool is not open';
--   END IF;
--
-- This migration:
-- 1. Updates all non-archived pools with status 'draft' to status 'open'
-- 2. Provides a helper query to manually open specific pools
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Open all draft pools that should be accepting wagers
-- ============================================================================

-- Update pools that are:
-- - Not archived
-- - Currently in 'draft' status
-- - Either have no close_time or close_time is in the future

UPDATE public.markets
SET status = 'open'
WHERE
  archived IS NOT TRUE
  AND status = 'draft'
  AND (close_time IS NULL OR close_time > now());

-- ============================================================================
-- STEP 2: Report on pools that were updated
-- ============================================================================

-- This will show what was changed (run this after the UPDATE if needed):
-- SELECT
--   id,
--   name,
--   status,
--   close_time,
--   total_pool,
--   (SELECT COUNT(*) FROM public.outcomes WHERE market_id = m.id) AS outcome_count
-- FROM public.markets m
-- WHERE status = 'open'
-- ORDER BY name;


-- ============================================================================
-- STEP 3: Helper - Manual pool opening (for specific pools)
-- ============================================================================

-- If you need to open specific pools by name, use this pattern:
-- (Commented out - uncomment and modify as needed)

/*
UPDATE public.markets
SET status = 'open'
WHERE name IN (
  'Race Overall Winner',
  'First Retirement'
)
AND archived IS NOT TRUE;
*/


-- ============================================================================
-- STEP 4: Verify outcomes exist for all open pools
-- ============================================================================

-- This ensures we're not opening pools without outcomes
-- (which would also cause wagers to fail)

DO $$
DECLARE
  pool_record RECORD;
  missing_outcomes_count INT := 0;
BEGIN
  FOR pool_record IN
    SELECT id, name
    FROM public.markets
    WHERE status = 'open'
      AND archived IS NOT TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.outcomes WHERE market_id = markets.id
      )
  LOOP
    RAISE WARNING 'Pool "%" (%) has no outcomes but is marked as open', pool_record.name, pool_record.id;
    missing_outcomes_count := missing_outcomes_count + 1;
  END LOOP;

  IF missing_outcomes_count > 0 THEN
    RAISE NOTICE '% open pool(s) are missing outcomes. These will still fail wagers.', missing_outcomes_count;
  ELSE
    RAISE NOTICE 'All open pools have outcomes. Ready for wagers.';
  END IF;
END $$;


-- ============================================================================
-- Migration complete!
-- ============================================================================
