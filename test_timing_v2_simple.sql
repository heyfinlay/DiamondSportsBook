-- Simple test for Timing Domain V2 schema and RPCs
-- Run this via: docker exec -i supabase_db_DiamondSportingBook psql -U postgres

\echo '=== Test 1: Verify table renames ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'timing%'
ORDER BY table_name;

\echo ''
\echo '=== Test 2: Verify timing_sessions has v2 columns ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'timing_sessions'
ORDER BY ordinal_position;

\echo ''
\echo '=== Test 3: Verify timing_session_state has v2 columns ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'timing_session_state'
ORDER BY ordinal_position;

\echo ''
\echo '=== Test 4: Verify timing_drivers has v2 columns ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'timing_drivers'
ORDER BY ordinal_position;

\echo ''
\echo '=== Test 5: Verify timing_laps has v2 columns ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'timing_laps'
ORDER BY ordinal_position;

\echo ''
\echo '=== Test 6: Verify v2 RPC functions exist ==='
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'timing_%'
ORDER BY routine_name;

\echo ''
\echo '=== Test 7: Verify RLS is enabled on all timing tables ==='
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'timing%'
ORDER BY tablename;

\echo ''
\echo '=== Test 8: Verify RLS policies exist ==='
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'timing%'
ORDER BY tablename, policyname;

\echo ''
\echo '=== Test 9: Check flag_status_v2 enum values ==='
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.flag_status_v2'::regtype
ORDER BY enumsortorder;

\echo ''
\echo '=== Test 10: Check driver_status_v2 enum values ==='
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.driver_status_v2'::regtype
ORDER BY enumsortorder;

\echo ''
\echo '=== Test 11: Verify live_driver_standings view exists ==='
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'live_driver_standings';

\echo ''
\echo '=== All schema verification tests completed! ==='
