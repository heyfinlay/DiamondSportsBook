-- ============================================================================
-- MIGRATION 0015: Fix V2 Schema Mismatches
-- ============================================================================
--
-- This migration fixes all remaining v1/v2 table name references and column
-- mismatches to ensure the timing domain works correctly with v2 schema.
--
-- Issues fixed:
-- 1. timing_log_lap uses lap_time_ms but column is lap_ms
-- 2. pit_events.duration_ms overload ambiguity (integer vs bigint)
-- 3. timing_delete_session_deep references old table name
-- 4. timing_invalidate_last_lap references old type name
--
-- ============================================================================

-- ============================================================================
-- FIX 1: Update pit_events.duration_ms from integer to bigint
-- ============================================================================

alter table public.pit_events
  alter column duration_ms type bigint;

-- ============================================================================
-- FIX 2: Fix timing_log_lap to use correct column name (lap_ms not lap_time_ms)
-- ============================================================================

-- Drop the broken version from migration 0011 and 0014
drop function if exists public.timing_log_lap(uuid, uuid, bigint);

-- Recreate with correct column name
create or replace function public.timing_log_lap(
  p_session_id uuid,
  p_driver_id uuid,
  p_lap_time_ms bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  lap_record public.timing_laps;
  driver_record public.timing_drivers;
  next_lap_number integer;
  min_lap_ms constant bigint := 20000;
  max_lap_ms constant bigint := 600000;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('marshal') and not public.has_permission('race_control') then
    raise exception 'Requires marshal or race control permission';
  end if;

  if p_lap_time_ms <= 0 then
    raise exception 'Lap time must be positive';
  end if;

  if p_lap_time_ms < min_lap_ms then
    raise exception 'Lap time too fast (minimum % ms)', min_lap_ms;
  end if;

  if p_lap_time_ms > max_lap_ms then
    raise exception 'Lap time too slow (maximum % ms)', max_lap_ms;
  end if;

  select * into driver_record
  from public.timing_drivers
  where id = p_driver_id
  for update;

  if driver_record is null then
    raise exception 'Driver not found';
  end if;

  if driver_record.session_id != p_session_id then
    raise exception 'Driver does not belong to this session';
  end if;

  select coalesce(max(lap_number), 0) + 1
  into next_lap_number
  from public.timing_laps
  where driver_id = p_driver_id;

  -- FIXED: Use lap_ms (the actual column name) not lap_time_ms
  insert into public.timing_laps(
    session_id,
    driver_id,
    lap_number,
    lap_ms,
    invalidated,
    checkpoint_missed,
    recorded_by
  ) values (
    p_session_id,
    p_driver_id,
    next_lap_number,
    p_lap_time_ms,
    false,
    false,
    actor
  )
  returning * into lap_record;

  update public.timing_drivers
  set
    laps = laps + 1,
    last_lap_ms = p_lap_time_ms,
    best_lap_ms = least(coalesce(best_lap_ms, p_lap_time_ms), p_lap_time_ms),
    total_time_ms = total_time_ms + p_lap_time_ms,
    current_lap_started_at = now()
  where id = p_driver_id
  returning * into driver_record;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'lap_logged',
    jsonb_build_object(
      'driver_id', p_driver_id,
      'lap_number', next_lap_number,
      'lap_ms', p_lap_time_ms
    ),
    actor
  );

  return jsonb_build_object(
    'lap', row_to_json(lap_record),
    'driver', row_to_json(driver_record)
  );
end;
$$;

grant execute on function public.timing_log_lap(uuid, uuid, bigint) to authenticated;

-- ============================================================================
-- FIX 3: Fix timing_log_pit_event to use bigint consistently
-- ============================================================================

-- Drop all overloads to remove ambiguity
drop function if exists public.timing_log_pit_event(uuid, integer);
drop function if exists public.timing_log_pit_event(uuid, bigint);

-- Recreate with single bigint signature (matching pit_events table)
create or replace function public.timing_log_pit_event(
  p_driver_id uuid,
  p_duration_ms bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  pit_row public.pit_events;
  driver_row public.timing_drivers;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') and not public.has_permission('marshal') then
    raise exception 'Requires marshal or race control permission';
  end if;

  select * into driver_row
  from public.timing_drivers
  where id = p_driver_id
  for update;

  if driver_row is null then
    raise exception 'Driver not found';
  end if;

  -- FIXED: Use timing_drivers (v2 table name)
  insert into public.pit_events(session_id, driver_id, duration_ms, created_by)
  values (driver_row.session_id, p_driver_id, p_duration_ms, actor)
  returning * into pit_row;

  update public.timing_drivers
  set pits = pits + 1
  where id = p_driver_id
  returning * into driver_row;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    driver_row.session_id,
    'pit_event_logged',
    jsonb_build_object('driver_id', p_driver_id, 'duration_ms', p_duration_ms),
    actor
  );

  return jsonb_build_object(
    'pit', row_to_json(pit_row),
    'driver', row_to_json(driver_row)
  );
end;
$$;

grant execute on function public.timing_log_pit_event(uuid, bigint) to authenticated;

-- ============================================================================
-- FIX 4: Fix timing_invalidate_last_lap to use v2 table names
-- ============================================================================

drop function if exists public.timing_invalidate_last_lap(uuid);

create or replace function public.timing_invalidate_last_lap(p_driver_id uuid)
returns public.timing_laps
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  lap_row public.timing_laps;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  -- FIXED: Use timing_laps (v2 table name)
  select *
  into lap_row
  from public.timing_laps
  where driver_id = p_driver_id
  order by lap_number desc, created_at desc
  limit 1;

  if lap_row.id is null then
    raise exception 'No laps to invalidate';
  end if;

  -- Mark as invalidated instead of deleting
  update public.timing_laps
  set invalidated = true
  where id = lap_row.id
  returning * into lap_row;

  -- Update driver stats
  update public.timing_drivers
  set
    laps = greatest(0, laps - 1),
    total_time_ms = greatest(0, total_time_ms - lap_row.lap_ms)
  where id = p_driver_id;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    lap_row.session_id,
    'lap_invalidated',
    jsonb_build_object(
      'driver_id', lap_row.driver_id,
      'lap_number', lap_row.lap_number,
      'lap_ms', lap_row.lap_ms
    ),
    actor
  );

  return lap_row;
end;
$$;

grant execute on function public.timing_invalidate_last_lap(uuid) to authenticated;

-- ============================================================================
-- FIX 5: Fix timing_delete_session_deep to use v2 table name
-- ============================================================================

drop function if exists public.timing_delete_session_deep(uuid);

create or replace function public.timing_delete_session_deep(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('super_admin') and not public.has_permission('race_control') then
    raise exception 'Requires super admin or race control permission';
  end if;

  -- FIXED: Use timing_sessions (v2 table name)
  delete from public.timing_sessions
  where id = p_session_id;
end;
$$;

grant execute on function public.timing_delete_session_deep(uuid) to authenticated;

-- ============================================================================
-- FIX 6: Add timing_log_penalty with v2 table references
-- ============================================================================

drop function if exists public.timing_log_penalty(uuid, uuid, text, integer);

create or replace function public.timing_log_penalty(
  p_session_id uuid,
  p_driver_id uuid,
  p_reason text,
  p_seconds integer
) returns public.penalties
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  penalty_row public.penalties;
  driver_session uuid;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  if p_session_id is null then
    raise exception 'Session id required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Penalty reason required';
  end if;

  if p_seconds is null or p_seconds <= 0 then
    raise exception 'Penalty seconds must be positive';
  end if;

  if p_driver_id is not null then
    -- FIXED: Use timing_drivers (v2 table name)
    select session_id
    into driver_session
    from public.timing_drivers
    where id = p_driver_id;

    if driver_session is null or driver_session <> p_session_id then
      raise exception 'Driver does not belong to session';
    end if;
  end if;

  insert into public.penalties(session_id, driver_id, reason, seconds, issued_by)
  values (p_session_id, p_driver_id, trim(p_reason), p_seconds, actor)
  returning * into penalty_row;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'penalty_logged',
    jsonb_build_object(
      'driver_id', p_driver_id,
      'seconds', p_seconds,
      'reason', trim(p_reason)
    ),
    actor
  );

  return penalty_row;
end;
$$;

grant execute on function public.timing_log_penalty(uuid, uuid, text, integer) to authenticated;

-- ============================================================================
-- Migration complete! All v1/v2 mismatches fixed.
-- ============================================================================
