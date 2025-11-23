-- ============================================================================
-- Fix Outcome Team Metadata
-- ============================================================================
--
-- Root cause: market_create_from_session was creating outcomes with only
-- driver_number and session_id in metadata, without team_name or driver_name.
-- This caused the pricing views to fall back to the label field (driver name)
-- for both teamName and driverName, resulting in duplicate driver names in the UI.
--
-- This migration:
-- 1. Updates market_create_from_session to populate team_name, team_color, and driver_name in outcome metadata
-- 2. Backfills existing outcomes with correct metadata from their linked drivers
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix market_create_from_session to include team metadata
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
    -- FIXED: Now includes team_name, team_color, and driver_name in the SELECT
    FOR driver_record IN
      SELECT
        id,
        name,
        number,
        COALESCE(team_name, name) AS team_name,
        COALESCE(primary_color, '#FFFFFF') AS color,
        COALESCE(secondary_color, '#FFFFFF') AS secondary_color
      FROM public.timing_drivers
      WHERE session_id = p_session_id
      ORDER BY number NULLS LAST, name
    LOOP
      -- FIXED: Now populates team_name, team_color, and driver_name in metadata
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
          'driver_name', driver_record.name,
          'team_name', driver_record.team_name,
          'team_color', driver_record.color,
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

  RETURN event_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.market_create_from_session(uuid, text, text, numeric, timestamptz, jsonb) TO authenticated;

-- ============================================================================
-- STEP 2: Backfill existing outcomes with team metadata
-- ============================================================================

-- Update existing outcomes that have a driver_id but are missing team metadata
UPDATE public.outcomes o
SET metadata = metadata || jsonb_build_object(
  'driver_name', d.name,
  'team_name', COALESCE(d.team_name, d.name),
  'team_color', COALESCE(d.primary_color, o.color, '#FFFFFF')
)
FROM public.timing_drivers d
WHERE o.driver_id = d.id
  AND (
    o.metadata->>'driver_name' IS NULL
    OR o.metadata->>'team_name' IS NULL
  );

-- ============================================================================
-- Migration complete!
-- ============================================================================
