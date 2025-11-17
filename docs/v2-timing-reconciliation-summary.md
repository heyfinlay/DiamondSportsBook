# V2 Timing Domain Reconciliation Summary

## Overview

This document summarizes the complete reconciliation of the timing domain to fix all v1/v2 schema mismatches and ensure the database, RPCs, and frontend code are in full agreement.

## Issues Fixed

### 1. **Lap Logging Column Mismatch**
- **Problem**: Migration 0011 and 0014 used column name `lap_time_ms` but the actual column in `timing_laps` is `lap_ms`
- **Error**: `column "lap_time_ms" of relation "timing_laps" does not exist`
- **Fix**: Migration 0015 corrected `timing_log_lap()` to use `lap_ms` column
- **Location**: [supabase/migrations/0015_fix_v2_schema_mismatches.sql](../supabase/migrations/0015_fix_v2_schema_mismatches.sql)

### 2. **Pit Event Function Overload Ambiguity**
- **Problem**: Two overloads existed - `timing_log_pit_event(uuid, integer)` and `timing_log_pit_event(uuid, bigint)`
- **Error**: `Could not choose the best candidate function`
- **Fix**:
  - Changed `pit_events.duration_ms` column from `integer` to `bigint`
  - Dropped all overloads and created single `timing_log_pit_event(uuid, bigint)` function
- **Location**: [supabase/migrations/0015_fix_v2_schema_mismatches.sql](../supabase/migrations/0015_fix_v2_schema_mismatches.sql)

### 3. **Lap Invalidation Type Reference**
- **Problem**: `timing_invalidate_last_lap` referenced old v1 type `public.laps`
- **Error**: `type "public.laps" does not exist`
- **Fix**: Updated function to use `public.timing_laps` table and now marks laps as invalidated instead of deleting them
- **Location**: [supabase/migrations/0015_fix_v2_schema_mismatches.sql](../supabase/migrations/0015_fix_v2_schema_mismatches.sql)

### 4. **Session Delete Table Reference**
- **Problem**: `timing_delete_session_deep` referenced old v1 table `public.sessions`
- **Error**: `relation "public.sessions" does not exist`
- **Fix**: Updated function to use `public.timing_sessions` and added race_control permission
- **Location**: [supabase/migrations/0015_fix_v2_schema_mismatches.sql](../supabase/migrations/0015_fix_v2_schema_mismatches.sql)

### 5. **Frontend Table Name References**
- **Problem**: Frontend queries used old table names `drivers` instead of `timing_drivers`
- **Fix**: Updated all Supabase queries to use v2 table names:
  - `drivers` → `timing_drivers`
  - Column `display_name` → `name`
  - Column `car_number` → `number`
- **Location**: [src/domains/timing/api/timingApi.ts](../src/domains/timing/api/timingApi.ts)

## Database Schema (Final State)

### Core Tables
- `timing_sessions` - Session metadata
- `timing_session_state` - Live session state
- `timing_drivers` - Driver entries per session
- `timing_laps` - Lap records
- `timing_events` - Event log
- `pit_events` - Pit stop records
- `penalties` - Penalty records

### Key Columns
- `timing_laps.lap_ms` (bigint) - Lap duration in milliseconds
- `pit_events.duration_ms` (bigint) - Pit duration in milliseconds (nullable)
- `timing_drivers.name` (text) - Driver name
- `timing_drivers.number` (integer) - Car number

## RPC Functions (Server-Timestamp Driven)

### Lap Logging
```sql
timing_log_lap_auto(p_driver_id uuid) → jsonb
```
- Automatically calculates lap time from `current_lap_started_at`
- No manual time input required
- Updates driver stats (laps, best_lap_ms, total_time_ms)

### Pit Logging
```sql
timing_log_pit_event(p_driver_id uuid, p_duration_ms bigint DEFAULT NULL) → jsonb
```
- Accepts optional duration (for future automatic timing)
- Currently called with `NULL` duration from UI
- Increments driver pit count

### Lap Invalidation
```sql
timing_invalidate_last_lap(p_driver_id uuid) → timing_laps
```
- Marks most recent lap as `invalidated = true`
- Decrements driver lap count and total time
- Does NOT delete the lap record

### Session Management
```sql
timing_delete_session_deep(p_session_id uuid) → void
```
- Deletes session and all related records via CASCADE
- Requires race_control or super_admin permission

### Other Functions
- `timing_log_penalty(session_id, driver_id, reason, seconds)`
- `timing_set_flag_status(session_id, flag)`
- `timing_pause_race(session_id)`
- `timing_resume_race(session_id)`
- `timing_update_driver_status(driver_id, status, reason)`
- `timing_log_control_error(session_id, message)`
- `timing_get_race_time(session_id)`

## Frontend Implementation

### No Manual Time Inputs
- ✅ Lap logging: Uses `timing_log_lap_auto()` - no manual ms input
- ✅ Pit logging: Passes `durationMs: null` - no manual time entry in UI
- All timing is server-driven using PostgreSQL `now()` function

### API Calls Updated
All timing API calls in [src/domains/timing/api/timingApi.ts](../src/domains/timing/api/timingApi.ts) now:
- Use correct v2 table names
- Use correct v2 column names
- Pass correct parameter types (bigint compatible)

## Testing Checklist

### ✅ Migrations Applied
- [x] Migration 0015 applied successfully to database
- [x] All functions created without errors
- [x] Column types updated (pit_events.duration_ms → bigint)

### Manual Testing Required

#### 1. Lap Logging
- [ ] Create and start a session via Race Control
- [ ] Log a lap for a driver using the lap button/hotkey
- [ ] Verify: No `"lap_time_ms does not exist"` error
- [ ] Verify: New row appears in `timing_laps` table
- [ ] Verify: Driver stats updated (laps count, last_lap_ms, total_time_ms)
- [ ] Verify: Lap duration is reasonable (calculated from current_lap_started_at)

#### 2. Pit Logging
- [ ] Open pit event form in Race Control
- [ ] Select a driver and log a pit event
- [ ] Verify: No `"best candidate function"` error
- [ ] Verify: No manual duration input in the UI
- [ ] Verify: New row in `pit_events` table with `duration_ms = NULL`
- [ ] Verify: Driver `pits` count incremented
- [ ] Verify: Event appears in control log feed

#### 3. Lap Invalidation
- [ ] Log a lap for a driver
- [ ] Use "Invalidate Last Lap" form to invalidate it
- [ ] Verify: No `"type 'public.laps' does not exist"` error
- [ ] Verify: Lap row still exists in `timing_laps` but `invalidated = true`
- [ ] Verify: Driver stats decremented (laps count, total_time_ms)
- [ ] Verify: Event appears in control log

#### 4. Session Delete
- [ ] Create a test session with drivers
- [ ] Delete the session using the delete button
- [ ] Verify: No `"public.sessions does not exist"` error
- [ ] Verify: Session removed from `timing_sessions` table
- [ ] Verify: Related laps/pit events/penalties also deleted (CASCADE)

#### 5. Live Timing Display
- [ ] Navigate to Live Timing page
- [ ] Verify: Driver names display correctly (from `timing_drivers.name`)
- [ ] Verify: Car numbers display correctly (from `timing_drivers.number`)
- [ ] Verify: Leaderboard calculates correctly
- [ ] Verify: Lap times format correctly (showing lap_ms)

#### 6. Control Log Feed
- [ ] Perform various actions (laps, pits, penalties, flags)
- [ ] Verify: All events appear in control log
- [ ] Verify: Event formatting uses correct column names
- [ ] Verify: Driver names display in event descriptions

## Database Migration History

1. `0001_identity.sql` - User profiles and roles
2. `0002_timing.sql` - Initial timing tables (v1)
3. `0005_timing_phase1.sql` - RLS policies on v1 tables
4. `0009_timing_phase2.sql` - Penalties and pit events (v1)
5. `0011_timing_v2_enhancements.sql` - **Renamed all tables to v2 naming**
6. `0013_session_setup_and_teams.sql` - Teams and session creation
7. `0014_race_control_hotkeys.sql` - Race control functions
8. `0015_fix_v2_schema_mismatches.sql` - **Fixed all v1/v2 mismatches** ✅

## Files Modified

### Database
- ✅ `supabase/migrations/0015_fix_v2_schema_mismatches.sql` (new)

### Frontend
- ✅ `src/domains/timing/api/timingApi.ts` (updated)

### No Changes Needed
- ✅ `src/app/control/RaceControlPage.tsx` - Already correct (no manual pit duration input)
- ✅ `supabase/migrations/0014_race_control_hotkeys.sql` - Already uses `lap_ms` column

## Next Steps

1. **Test all operations** using the checklist above
2. **Report any failures** immediately
3. **Update TypeScript types** if any schema changes are discovered during testing
4. **Document edge cases** found during testing

## Notes

- All timing is now server-timestamp driven - no client-provided milliseconds
- Lap invalidation now marks records instead of deleting them (better audit trail)
- All v1 table references eliminated from the codebase
- All RPCs use v2 table names and column names consistently
- Migration 0015 is idempotent and can be re-run safely
