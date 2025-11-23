-- ============================================================================
-- Session lifecycle controls: ended_at tracking, timer fixes, force end RPC
-- ============================================================================

-- 1) Ensure timing_sessions has an ended_at column and allow new statuses
ALTER TABLE public.timing_sessions
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

ALTER TABLE public.timing_sessions
  DROP CONSTRAINT IF EXISTS timing_sessions_status_check;

ALTER TABLE public.timing_sessions
  ADD CONSTRAINT timing_sessions_status_check
  CHECK (status in ('draft', 'scheduled', 'active', 'finished', 'aborted', 'completed'));

-- 2) Update timing_finish_session to freeze the race clock and stamp ended_at
CREATE OR REPLACE FUNCTION public.timing_finish_session(p_session_id uuid)
RETURNS SETOF public.timing_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  rec record;
  pos integer := 0;
  leader_laps integer := 0;
  leader_time bigint := null;
  gap_ms bigint;
  gap_laps integer;
  final_time bigint := 0;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires race control permission';
  END IF;

  DELETE FROM public.timing_results WHERE session_id = p_session_id;

  FOR rec IN
    SELECT id AS driver_id, laps, total_time_ms, status
    FROM public.timing_drivers
    WHERE session_id = p_session_id
    ORDER BY laps DESC, total_time_ms ASC NULLS LAST, created_at ASC
  LOOP
    pos := pos + 1;
    IF pos = 1 THEN
      leader_laps := coalesce(rec.laps, 0);
      leader_time := rec.total_time_ms;
    END IF;

    gap_laps := leader_laps - coalesce(rec.laps, 0);
    IF gap_laps = 0 AND leader_time IS NOT NULL AND rec.total_time_ms IS NOT NULL THEN
      gap_ms := greatest(0, rec.total_time_ms - leader_time);
    ELSE
      gap_ms := NULL;
    END IF;

    INSERT INTO public.timing_results(
      session_id,
      driver_id,
      position,
      laps,
      total_time_ms,
      gap_ms,
      gap_laps,
      status
    )
    VALUES (
      p_session_id,
      rec.driver_id,
      pos,
      coalesce(rec.laps, 0),
      rec.total_time_ms,
      gap_ms,
      gap_laps,
      rec.status
    );
  END LOOP;

  final_time := public.timing_get_race_time(p_session_id);

  UPDATE public.timing_session_state
  SET
    procedure_phase = 'finished'::public.session_phase,
    is_timing = false,
    is_paused = true,
    pause_started_at = now(),
    flag_status = 'checkered'::public.flag_status_v2,
    race_time_ms = final_time,
    total_duration_ms = final_time
  WHERE session_id = p_session_id;

  UPDATE public.timing_sessions
  SET
    status = 'finished',
    ended_at = now()
  WHERE id = p_session_id;

  INSERT INTO public.timing_events(session_id, type, payload, created_by)
  VALUES (
    p_session_id,
    'race_finished',
    jsonb_build_object('results_count', pos),
    actor
  );

  RETURN QUERY
    SELECT * FROM public.timing_results
    WHERE session_id = p_session_id
    ORDER BY position ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timing_finish_session(uuid) TO authenticated;

-- 3) Force-end RPC for manual interventions / clock stop
CREATE OR REPLACE FUNCTION public.timing_force_end_session(
  p_session_id uuid,
  p_status text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS public.timing_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  session_row public.timing_sessions;
  normalized_status text;
  final_time bigint := 0;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires race control permission';
  END IF;

  SELECT * INTO session_row
  FROM public.timing_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  normalized_status := coalesce(nullif(p_status, ''), 'aborted');
  IF normalized_status NOT IN ('finished', 'aborted', 'completed') THEN
    normalized_status := 'aborted';
  END IF;

  final_time := public.timing_get_race_time(p_session_id);

  UPDATE public.timing_session_state
  SET
    procedure_phase = 'finished'::public.session_phase,
    is_timing = false,
    is_paused = true,
    pause_started_at = now(),
    flag_status = 'checkered'::public.flag_status_v2,
    race_time_ms = final_time,
    total_duration_ms = final_time
  WHERE session_id = p_session_id;

  UPDATE public.timing_sessions
  SET
    status = normalized_status,
    ended_at = now()
  WHERE id = p_session_id
  RETURNING * INTO session_row;

  INSERT INTO public.timing_events(session_id, type, payload, created_by)
  VALUES (
    p_session_id,
    'race_force_finished',
    jsonb_build_object(
      'status', normalized_status,
      'reason', coalesce(nullif(trim(p_reason), ''), 'manual_stop'),
      'elapsed_ms', final_time
    ),
    actor
  );

  RETURN session_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timing_force_end_session(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.timing_force_end_session IS
  'Force a timing session into a finished state, freezing the race clock and stamping ended_at. Used as an emergency stop when the standard classification finish cannot run.';

-- 4) When archiving, ensure we also capture ended_at if it was never set
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
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('super_admin') AND NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires super admin or race control permission';
  END IF;

  SELECT * INTO session_row FROM public.timing_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF session_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Session is already archived';
  END IF;

  UPDATE public.timing_sessions
  SET
    status = 'completed',
    archived_at = now(),
    ended_at = coalesce(ended_at, now())
  WHERE id = p_session_id;

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
