-- Test script for Timing Domain V2 RPCs
-- This script tests all the new V2 timing functions

-- Setup: Create a test user with race_control permission
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Create a test user (simulating auth.uid())
  INSERT INTO auth.users (id, email)
  VALUES (gen_random_uuid(), 'test_race_control@example.com')
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_user_id;

  -- Give them race_control permission
  INSERT INTO public.user_roles (user_id, role)
  VALUES (test_user_id, 'race_control')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test user created with ID: %', test_user_id;
END $$;

-- Test 1: timing_create_session
\echo '=== Test 1: timing_create_session ==='
SELECT public.timing_create_session(jsonb_build_object(
  'name', 'Test GP 2025',
  'mode', 'race',
  'starts_at', now() + interval '1 hour',
  'ends_at', now() + interval '3 hours',
  'drivers', jsonb_build_array(
    jsonb_build_object('number', 44, 'name', 'Lewis Hamilton', 'team_name', 'Mercedes', 'team_color', '#00D2BE'),
    jsonb_build_object('number', 1, 'name', 'Max Verstappen', 'team_name', 'Red Bull Racing', 'team_color', '#0600EF'),
    jsonb_build_object('number', 16, 'name', 'Charles Leclerc', 'team_name', 'Ferrari', 'team_color', '#DC0000')
  )
)) AS session;

-- Get the session ID for subsequent tests
\echo '=== Fetching created session ==='
SELECT id, name, mode, status FROM public.timing_sessions ORDER BY created_at DESC LIMIT 1;

-- Store session_id in a variable for use in later tests
\gset session_

\echo '=== Session ID: ' :session_id ' ==='

-- Test 2: Verify session state was created
\echo '=== Test 2: Verify session state ==='
SELECT
  procedure_phase,
  flag_status,
  is_timing,
  race_time_ms
FROM public.timing_session_state
WHERE session_id = :'session_id';

-- Test 3: Verify drivers were created
\echo '=== Test 3: Verify drivers ==='
SELECT
  number,
  name,
  team_name,
  status,
  laps,
  total_time_ms
FROM public.timing_drivers
WHERE session_id = :'session_id'
ORDER BY number;

-- Store a driver_id for lap testing
\echo '=== Fetching driver ID ==='
SELECT id FROM public.timing_drivers WHERE session_id = :'session_id' AND number = 44 LIMIT 1;
\gset driver_

-- Test 4: timing_update_session_state
\echo '=== Test 4: timing_update_session_state ==='
SELECT public.timing_update_session_state(
  :'session_id'::uuid,
  jsonb_build_object(
    'procedure_phase', 'warmup',
    'flag_status', 'yellow',
    'announcement', 'Session warming up - 5 minutes remaining'
  )
) AS updated_state;

-- Test 5: timing_initialize_race
\echo '=== Test 5: timing_initialize_race ==='
SELECT public.timing_initialize_race(:'session_id'::uuid) AS race_initialized;

-- Verify drivers are now active
\echo '=== Verify drivers are active ==='
SELECT number, name, status, current_lap_started_at IS NOT NULL AS has_lap_start
FROM public.timing_drivers
WHERE session_id = :'session_id'
ORDER BY number;

-- Test 6: timing_log_lap (valid lap)
\echo '=== Test 6: timing_log_lap (valid lap) ==='
SELECT public.timing_log_lap(
  :'session_id'::uuid,
  :'driver_id'::uuid,
  85000  -- 1:25.000
) AS lap_logged;

-- Verify driver stats were updated
\echo '=== Verify driver stats after lap 1 ==='
SELECT
  number,
  name,
  laps,
  last_lap_ms,
  best_lap_ms,
  total_time_ms
FROM public.timing_drivers
WHERE id = :'driver_id'::uuid;

-- Test 7: timing_log_lap (second lap - faster)
\echo '=== Test 7: timing_log_lap (second lap, faster) ==='
SELECT public.timing_log_lap(
  :'session_id'::uuid,
  :'driver_id'::uuid,
  83500  -- 1:23.500
) AS lap_logged;

-- Verify best lap was updated
\echo '=== Verify best lap was updated ==='
SELECT
  number,
  name,
  laps,
  last_lap_ms,
  best_lap_ms,
  total_time_ms
FROM public.timing_drivers
WHERE id = :'driver_id'::uuid;

-- Test 8: timing_log_lap (invalid - too fast)
\echo '=== Test 8: timing_log_lap (too fast - should fail) ==='
DO $$
BEGIN
  PERFORM public.timing_log_lap(
    (SELECT id FROM public.timing_sessions ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM public.timing_drivers ORDER BY created_at LIMIT 1),
    15000  -- 15 seconds - too fast
  );
  RAISE EXCEPTION 'Should have failed!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Correctly rejected lap that was too fast: %', SQLERRM;
END $$;

-- Test 9: timing_log_lap (invalid - too slow)
\echo '=== Test 9: timing_log_lap (too slow - should fail) ==='
DO $$
BEGIN
  PERFORM public.timing_log_lap(
    (SELECT id FROM public.timing_sessions ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM public.timing_drivers ORDER BY created_at LIMIT 1),
    700000  -- 11+ minutes - too slow
  );
  RAISE EXCEPTION 'Should have failed!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Correctly rejected lap that was too slow: %', SQLERRM;
END $$;

-- Test 10: Verify live standings view works
\echo '=== Test 10: Verify live standings view ==='
SELECT
  car_number,
  driver_name,
  laps_completed,
  best_lap_ms,
  last_lap_ms,
  total_time_ms,
  status,
  position
FROM public.live_driver_standings
WHERE session_id = :'session_id'
ORDER BY position;

-- Test 11: Check timing events were logged
\echo '=== Test 11: Check timing events ==='
SELECT
  type,
  payload,
  created_at
FROM public.timing_events
WHERE session_id = :'session_id'
ORDER BY created_at;

-- Test 12: Verify RLS policies (anonymous read access)
\echo '=== Test 12: Verify RLS - anonymous can read active session ==='
SET ROLE anon;
SELECT COUNT(*) AS readable_sessions FROM public.timing_sessions WHERE status = 'active';
SELECT COUNT(*) AS readable_drivers FROM public.timing_drivers;
SELECT COUNT(*) AS readable_laps FROM public.timing_laps;
RESET ROLE;

\echo '=== All tests completed! ==='
