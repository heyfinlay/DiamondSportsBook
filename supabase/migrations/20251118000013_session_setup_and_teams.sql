-- ============================================================================
-- MIGRATION 0013: Session Setup System & Championship Teams
-- ============================================================================
--
-- This migration adds:
-- 1. Teams table for championship team data
-- 2. Enhanced session setup RPC for creating sessions with drivers
-- 3. Session templates for DBGP lineups (Practice, Qualifying, Race)
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Create teams table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text UNIQUE NOT NULL,
  name text NOT NULL,
  abbrev text NOT NULL,
  primary_hex text NOT NULL,
  secondary_hex text NOT NULL,
  primary_driver text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Teams are readable by everyone
CREATE POLICY "Teams readable by all"
  ON public.teams
  FOR SELECT
  USING (true);

-- Teams managed by race control or super admin
CREATE POLICY "Teams managed by race control"
  ON public.teams
  FOR ALL
  USING (public.has_permission('race_control') OR public.has_permission('super_admin'));

-- ============================================================================
-- STEP 2: Add team reference to timing_drivers
-- ============================================================================

-- Add optional team_id reference to drivers (for linking to championship teams)
ALTER TABLE public.timing_drivers
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);

-- Add team colors to drivers for display
ALTER TABLE public.timing_drivers
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text;

-- ============================================================================
-- STEP 3: Seed DBGP Championship Teams
-- ============================================================================

INSERT INTO public.teams (team_id, name, abbrev, primary_hex, secondary_hex, primary_driver) VALUES
  ('UGC', 'Underground Club', 'UGC', '#FEFF99', '#000000', 'Dennis Wilder'),
  ('EMS', 'EMS', 'EMS', '#CAB9C4', '#B35A91', 'James Black'),
  ('FLY', 'Flywheels Motorsport', 'FLY', '#460106', '#C6C5C8', 'Steiny'),
  ('LSC', 'Los Santos Customs', 'LSC', '#050505', '#6367B1', 'Mark Major'),
  ('BHM', 'Bahama Mamas', 'BHM', '#74D7FC', '#FF78C3', 'Casey Myers'),
  ('LSPD', 'LSPD', 'PD', '#111A38', '#030512', 'Bill Baccarat'),
  ('BNB', 'Blend & Barrel', 'BNB', '#BEBEBC', '#0F0F10', 'Unassigned'),
  ('MOS', 'Mosleys', 'MOS', '#320301', '#0D0D0E', 'Scotty Burns')
ON CONFLICT (team_id) DO UPDATE SET
  name = EXCLUDED.name,
  abbrev = EXCLUDED.abbrev,
  primary_hex = EXCLUDED.primary_hex,
  secondary_hex = EXCLUDED.secondary_hex,
  primary_driver = EXCLUDED.primary_driver,
  updated_at = now();

-- ============================================================================
-- STEP 4: Enhanced Session Setup RPC
-- ============================================================================

-- Create or replace the session setup function
CREATE OR REPLACE FUNCTION public.timing_create_session_with_drivers(
  p_name text,
  p_mode text,
  p_track_name text,
  p_laps_target integer,
  p_starts_at timestamptz,
  p_drivers jsonb
) RETURNS public.timing_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  session_row public.timing_sessions;
  driver_item jsonb;
  team_row public.teams;
BEGIN
  -- Authorization check
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.has_permission('race_control') AND NOT public.has_permission('super_admin') THEN
    RAISE EXCEPTION 'Requires race control or super admin permission';
  END IF;

  -- Validate mode
  IF p_mode NOT IN ('practice', 'qualifying', 'race') THEN
    RAISE EXCEPTION 'Invalid mode. Must be practice, qualifying, or race';
  END IF;

  -- Create the session
  INSERT INTO public.timing_sessions(
    name,
    mode,
    track_name,
    laps_target,
    starts_at,
    status,
    created_by
  )
  VALUES (
    p_name,
    p_mode,
    p_track_name,
    p_laps_target,
    p_starts_at,
    'draft',
    actor
  )
  RETURNING * INTO session_row;

  -- Create session state
  INSERT INTO public.timing_session_state(session_id)
  VALUES (session_row.id);

  -- Add drivers to the session
  FOR driver_item IN SELECT * FROM jsonb_array_elements(p_drivers)
  LOOP
    -- Look up team if team_id provided
    team_row := NULL;
    IF driver_item->>'team_id' IS NOT NULL THEN
      SELECT * INTO team_row
      FROM public.teams
      WHERE team_id = driver_item->>'team_id';
    END IF;

    -- Insert driver
    INSERT INTO public.timing_drivers(
      session_id,
      number,
      name,
      team_name,
      team_id,
      primary_color,
      secondary_color,
      status
    )
    VALUES (
      session_row.id,
      (driver_item->>'number')::integer,
      driver_item->>'name',
      COALESCE(driver_item->>'team_name', team_row.name),
      team_row.id,
      COALESCE(driver_item->>'primary_color', team_row.primary_hex),
      COALESCE(driver_item->>'secondary_color', team_row.secondary_hex),
      'ready'
    );
  END LOOP;

  RETURN session_row;
END;
$$;

-- Grant execute to authenticated users (RPC will check permissions internally)
GRANT EXECUTE ON FUNCTION public.timing_create_session_with_drivers TO authenticated;

-- ============================================================================
-- STEP 5: Template Helper Function - Get DBGP Lineup
-- ============================================================================

-- Function to retrieve the default DBGP lineup as JSONB
CREATE OR REPLACE FUNCTION public.get_dbgp_lineup()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'number', CASE team_id
        WHEN 'UGC' THEN 2
        WHEN 'EMS' THEN 1
        WHEN 'FLY' THEN 4
        WHEN 'LSC' THEN 7
        WHEN 'BHM' THEN 8
        WHEN 'LSPD' THEN 3
        WHEN 'BNB' THEN 6
        WHEN 'MOS' THEN 5
      END,
      'name', primary_driver,
      'team_id', team_id,
      'team_name', name,
      'primary_color', primary_hex,
      'secondary_color', secondary_hex
    )
    ORDER BY CASE team_id
      WHEN 'EMS' THEN 1
      WHEN 'UGC' THEN 2
      WHEN 'LSPD' THEN 3
      WHEN 'FLY' THEN 4
      WHEN 'MOS' THEN 5
      WHEN 'BNB' THEN 6
      WHEN 'LSC' THEN 7
      WHEN 'BHM' THEN 8
    END
  )
  FROM public.teams
  WHERE primary_driver IS NOT NULL AND primary_driver != 'Unassigned';
$$;

GRANT EXECUTE ON FUNCTION public.get_dbgp_lineup TO authenticated;

-- ============================================================================
-- STEP 6: Add event_id to timing_sessions for linking to betting events
-- ============================================================================

ALTER TABLE public.timing_sessions
  ADD COLUMN IF NOT EXISTS event_id uuid;

-- Add comment explaining the relationship
COMMENT ON COLUMN public.timing_sessions.event_id IS 'Optional reference to betting event. Sessions can exist without betting events.';
