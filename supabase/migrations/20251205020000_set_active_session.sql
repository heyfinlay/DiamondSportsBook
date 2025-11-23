-- Track live timing session state
ALTER TABLE public.timing_sessions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS timing_sessions_single_active
ON public.timing_sessions (is_active)
WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.set_active_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('race_control') THEN
    RAISE EXCEPTION 'Requires race control permission';
  END IF;

  UPDATE public.timing_sessions
  SET is_active = false
  WHERE is_active = true;

  UPDATE public.timing_sessions
  SET is_active = true
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_session(uuid) TO authenticated;
