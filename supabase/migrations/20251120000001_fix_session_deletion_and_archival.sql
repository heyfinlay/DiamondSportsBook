-- ============================================================================
-- FIX SESSION DELETION AND IMPLEMENT ARCHIVAL
-- ============================================================================
-- This migration addresses the FK constraint violation when deleting sessions
-- that have linked events/markets, and implements proper archival semantics.
--
-- Changes:
-- 1. Add archived_at to timing_sessions for lifecycle management
-- 2. Rewrite timing_delete_session_deep to prevent deletion of sessions with data
-- 3. Add timing_archive_session RPC for archiving completed sessions
-- 4. Add timing_restore_session RPC for un-archiving sessions
-- 5. Create get_live_market_events RPC for public Live Markets page
-- 6. Create get_archived_market_events RPC for Results/Past Markets page
-- ============================================================================

-- ============================================================================
-- STEP 1: Add archived_at to timing_sessions
-- ============================================================================
ALTER TABLE public.timing_sessions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.timing_sessions.archived_at IS
  'Timestamp when the session was archived. Archived sessions and their markets do not appear on the Live Markets page, but can be shown on a Results/Past Markets page.';

-- ============================================================================
-- STEP 2: Rewrite timing_delete_session_deep to validate before deletion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.timing_delete_session_deep(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  event_count integer;
  driver_count integer;
  lap_count integer;
BEGIN
  -- Authorization check
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('super_admin') AND NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires super admin or race control permission';
  END IF;

  -- Check if the session has any linked events (markets)
  SELECT COUNT(*) INTO event_count
  FROM public.events
  WHERE session_id = p_session_id;

  IF event_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete session: % linked event(s) found. Archive the session instead using timing_archive_session.', event_count
      USING HINT = 'Use timing_archive_session to hide this session from Live Markets while preserving all data.';
  END IF;

  -- Check if the session has any timing data (drivers, laps, etc.)
  SELECT COUNT(*) INTO driver_count
  FROM public.timing_drivers
  WHERE session_id = p_session_id;

  SELECT COUNT(*) INTO lap_count
  FROM public.timing_laps
  WHERE session_id = p_session_id;

  IF driver_count > 0 OR lap_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete session: timing data exists (% drivers, % laps). Archive the session instead.', driver_count, lap_count
      USING HINT = 'Use timing_archive_session to preserve session data while removing it from Live Markets.';
  END IF;

  -- If we reach here, the session has no dependencies and can be safely deleted
  -- Cascade deletes will handle timing_session_state, timing_events, etc.
  DELETE FROM public.timing_sessions
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timing_delete_session_deep(uuid) TO authenticated;

COMMENT ON FUNCTION public.timing_delete_session_deep IS
  'Deep delete a timing session. Only allows deletion if the session has no linked events/markets or timing data. For sessions with data, use timing_archive_session instead.';

-- ============================================================================
-- STEP 3: Create timing_archive_session RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.timing_archive_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  session_row public.timing_sessions;
BEGIN
  -- Authorization check
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('super_admin') AND NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires super admin or race control permission';
  END IF;

  -- Fetch the session
  SELECT * INTO session_row FROM public.timing_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Already archived?
  IF session_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Session is already archived';
  END IF;

  -- Update session: mark as completed and archived
  UPDATE public.timing_sessions
  SET
    status = 'completed',
    archived_at = now()
  WHERE id = p_session_id;

  -- Also archive all markets associated with this session's events
  -- This ensures markets don't show up on Live Markets page
  UPDATE public.markets m
  SET
    archived = true,
    archived_at = now()
  FROM public.events e
  WHERE m.event_id = e.id
    AND e.session_id = p_session_id
    AND m.archived = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timing_archive_session(uuid) TO authenticated;

COMMENT ON FUNCTION public.timing_archive_session IS
  'Archive a timing session and all its associated markets. Archived sessions do not appear on the Live Markets page but can be shown on a Results/Past Markets page.';

-- ============================================================================
-- STEP 4: Create timing_restore_session RPC (un-archive)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.timing_restore_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  session_row public.timing_sessions;
BEGIN
  -- Authorization check
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('super_admin') AND NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires super admin or race control permission';
  END IF;

  -- Fetch the session
  SELECT * INTO session_row FROM public.timing_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Not archived?
  IF session_row.archived_at IS NULL THEN
    RAISE EXCEPTION 'Session is not archived';
  END IF;

  -- Update session: clear archived_at (keep status as-is)
  UPDATE public.timing_sessions
  SET archived_at = NULL
  WHERE id = p_session_id;

  -- Also restore all markets associated with this session's events
  UPDATE public.markets m
  SET
    archived = false,
    archived_at = NULL
  FROM public.events e
  WHERE m.event_id = e.id
    AND e.session_id = p_session_id
    AND m.archived = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timing_restore_session(uuid) TO authenticated;

COMMENT ON FUNCTION public.timing_restore_session IS
  'Restore an archived timing session and its associated markets, making them visible on Live Markets again.';

-- ============================================================================
-- STEP 5: Create get_live_market_events RPC for public Live Markets page
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_live_market_events()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  starts_at timestamptz,
  takeout numeric,
  session_id uuid,
  session_name text,
  session_track_name text,
  session_mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.status,
    e.starts_at,
    e.takeout,
    ts.id AS session_id,
    ts.name AS session_name,
    ts.track_name AS session_track_name,
    ts.mode AS session_mode
  FROM public.events e
  LEFT JOIN public.timing_sessions ts ON ts.id = e.session_id
  WHERE
    -- Only show events with active/scheduled sessions
    (ts.id IS NULL OR (ts.status IN ('scheduled', 'active') AND ts.archived_at IS NULL))
    -- And the event itself is active
    AND e.status IN ('upcoming', 'active')
    -- And has at least one non-archived, open/closed market
    AND EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.event_id = e.id
        AND m.archived = false
        AND m.status IN ('open', 'closed')
    )
  ORDER BY e.starts_at ASC NULLS LAST, e.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_market_events() TO anon, authenticated;

COMMENT ON FUNCTION public.get_live_market_events IS
  'Returns events with active/scheduled sessions that have non-archived markets. Used for the public Live Markets page.';

-- ============================================================================
-- STEP 6: Create get_archived_market_events RPC for Results/Past Markets page
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_archived_market_events()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  starts_at timestamptz,
  takeout numeric,
  session_id uuid,
  session_name text,
  session_track_name text,
  session_mode text,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.status,
    e.starts_at,
    e.takeout,
    ts.id AS session_id,
    ts.name AS session_name,
    ts.track_name AS session_track_name,
    ts.mode AS session_mode,
    ts.archived_at
  FROM public.events e
  LEFT JOIN public.timing_sessions ts ON ts.id = e.session_id
  WHERE
    -- Only show events with completed/archived sessions
    (ts.id IS NOT NULL AND (ts.status = 'completed' OR ts.archived_at IS NOT NULL))
    -- Or events in settled/archived status
    OR e.status IN ('settled', 'archived')
  ORDER BY
    ts.archived_at DESC NULLS LAST,
    e.starts_at DESC NULLS LAST,
    e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_archived_market_events() TO anon, authenticated;

COMMENT ON FUNCTION public.get_archived_market_events IS
  'Returns events with completed/archived sessions or settled markets. Used for the Results/Past Markets page showing historical outcomes.';
