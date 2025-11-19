-- ============================================================================
-- Fix Market Creation Issues
-- ============================================================================
--
-- This migration fixes three classes of errors:
-- 1. "subquery must return only one column" - Fixed RETURN statement
-- 2. Numeric field overflow - Normalized takeout/rake handling
-- 3. Increased max_stake limit to 1,000,000
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix numeric types and constraints for stakes
-- ============================================================================

-- Increase precision for min/max stake to support up to 1,000,000
ALTER TABLE public.markets
  ALTER COLUMN min_stake TYPE numeric(12,2),
  ALTER COLUMN max_stake TYPE numeric(12,2);

-- Update default max_stake to reasonable limit
ALTER TABLE public.markets
  ALTER COLUMN max_stake SET DEFAULT 1000000;

-- ============================================================================
-- STEP 2: Normalize takeout/rake handling
-- ============================================================================

-- Ensure events.takeout has sufficient precision for percentages (0.12 = 12%)
-- Already defined as numeric, verify precision
ALTER TABLE public.events
  ALTER COLUMN takeout TYPE numeric(5,4);

-- Ensure markets.rake_percent has sufficient precision
ALTER TABLE public.markets
  ALTER COLUMN rake_percent TYPE numeric(5,4);

-- Set sensible default (12% = 0.12)
ALTER TABLE public.markets
  ALTER COLUMN rake_percent SET DEFAULT 0.12;

-- ============================================================================
-- STEP 3: Fix market_create_from_session RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.market_create_from_session(
  p_session_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_takeout numeric DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_pools jsonb DEFAULT '[]'::jsonb
) RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  session_row public.timing_sessions;
  event_row public.events;
  pool_item jsonb;
  pool_row public.markets;
  driver_record record;
  pool_count integer := 0;
  takeout_value numeric;
BEGIN
  -- Authorization
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  -- Fetch session
  SELECT * INTO session_row FROM public.timing_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Normalize takeout: ensure it's in decimal form (0.12 = 12%)
  -- If user passes 10 (meaning 10%), convert to 0.10
  -- If user passes 0.10, keep as is
  takeout_value := COALESCE(p_takeout, 0.12);

  -- Auto-convert if value > 1 (assume percentage was passed, e.g. 10 for 10%)
  IF takeout_value > 1 THEN
    takeout_value := takeout_value / 100.0;
  END IF;

  -- Clamp to reasonable range (0.5% to 50%)
  IF takeout_value < 0.005 OR takeout_value > 0.50 THEN
    RAISE EXCEPTION 'Takeout must be between 0.5%% and 50%% (0.005 to 0.50), got %', takeout_value;
  END IF;

  -- Create event (market container)
  INSERT INTO public.events(
    session_id,
    title,
    description,
    starts_at,
    takeout,
    status,
    created_by
  ) VALUES (
    p_session_id,
    COALESCE(p_title, session_row.name),
    p_description,
    COALESCE(p_starts_at, session_row.starts_at),
    takeout_value,
    'draft',
    actor
  ) RETURNING * INTO event_row;

  -- Create pools
  FOR pool_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_pools, '[]'::jsonb))
  LOOP
    pool_count := pool_count + 1;

    -- Extract and validate pool-specific rake
    DECLARE
      pool_rake numeric;
      pool_min_stake numeric;
      pool_max_stake numeric;
    BEGIN
      -- Get pool rake, default to event takeout
      pool_rake := COALESCE((pool_item->>'rake_percent')::numeric, takeout_value);

      -- Auto-convert if percentage passed
      IF pool_rake > 1 THEN
        pool_rake := pool_rake / 100.0;
      END IF;

      -- Get stakes with sensible defaults and limits
      pool_min_stake := COALESCE((pool_item->>'min_stake')::numeric, 10);
      pool_max_stake := COALESCE((pool_item->>'max_stake')::numeric, 1000000);

      -- Validate stake range
      IF pool_min_stake < 1 THEN
        RAISE EXCEPTION 'Minimum stake must be at least 1';
      END IF;

      IF pool_max_stake > 1000000 THEN
        RAISE EXCEPTION 'Maximum stake cannot exceed 1,000,000';
      END IF;

      IF pool_min_stake > pool_max_stake THEN
        RAISE EXCEPTION 'Minimum stake (%) cannot exceed maximum stake (%)', pool_min_stake, pool_max_stake;
      END IF;

      -- Insert pool
      INSERT INTO public.markets(
        event_id,
        name,
        description,
        min_stake,
        max_stake,
        close_time,
        pool_type,
        rake_percent
      ) VALUES (
        event_row.id,
        pool_item->>'name',
        pool_item->>'description',
        pool_min_stake,
        pool_max_stake,
        (pool_item->>'close_time')::timestamptz,
        COALESCE(NULLIF(pool_item->>'pool_type', ''), 'winner'),
        pool_rake
      ) RETURNING * INTO pool_row;
    END;

    -- Create outcomes for each driver
    FOR driver_record IN
      SELECT id, name, number, COALESCE(primary_color, '#FFFFFF') AS color
      FROM public.timing_drivers
      WHERE session_id = p_session_id
      ORDER BY number NULLS LAST, name
    LOOP
      INSERT INTO public.outcomes(
        market_id,
        label,
        driver_id,
        color,
        metadata
      ) VALUES (
        pool_row.id,
        driver_record.name,
        driver_record.id,
        driver_record.color,
        jsonb_build_object(
          'driver_number', driver_record.number,
          'session_id', p_session_id
        )
      );
    END LOOP;
  END LOOP;

  -- Validate at least one pool was created
  IF pool_count = 0 THEN
    RAISE EXCEPTION 'At least one pool definition required';
  END IF;

  -- Refresh container status
  PERFORM public.market_refresh_container_status(event_row.id);

  -- FIXED: Return the event_row directly instead of subquery
  -- This was causing "subquery must return only one column" error
  RETURN event_row;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.market_create_from_session(uuid, text, text, numeric, timestamptz, jsonb) TO authenticated;

-- ============================================================================
-- STEP 4: Update other market admin RPCs for consistency
-- ============================================================================

-- Update admin wagers to use display_name (not user_name) for consistency
CREATE OR REPLACE FUNCTION public.market_admin_wagers(
  p_market_id uuid,
  p_pool_id uuid DEFAULT NULL
) RETURNS TABLE (
  wager_id uuid,
  pool_id uuid,
  pool_name text,
  outcome_id uuid,
  outcome_label text,
  user_id uuid,
  user_name text,
  stake numeric,
  status public.wager_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.market_id,
    m.name,
    w.outcome_id,
    o.label,
    w.user_id,
    COALESCE(p.display_name, 'Unknown User'),
    w.stake,
    w.status,
    w.created_at
  FROM public.wagers w
  JOIN public.markets m ON m.id = w.market_id
  JOIN public.outcomes o ON o.id = w.outcome_id
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE m.event_id = p_market_id
    AND (p_pool_id IS NULL OR w.market_id = p_pool_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.market_admin_wagers(uuid, uuid) TO authenticated;

-- ============================================================================
-- Migration complete!
-- ============================================================================
