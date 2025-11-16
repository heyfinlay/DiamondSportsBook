-- Timing Domain V2 Enhancement Migration
-- This migration transforms the existing timing schema to match the v2 specification
-- while preserving all existing data and functionality.

-- ============================================================================
-- STEP 1: Rename tables to v2 naming convention
-- ============================================================================

-- Rename core timing tables
alter table if exists public.sessions rename to timing_sessions;
alter table if exists public.session_state rename to timing_session_state;
alter table if exists public.drivers rename to timing_drivers;
alter table if exists public.laps rename to timing_laps;
alter table if exists public.race_events rename to timing_events;

-- Note: penalties, pit_events, session_members stay as-is (they're supporting tables)

-- ============================================================================
-- STEP 2: Update foreign key references after table renames
-- ============================================================================

-- Foreign keys are automatically updated by PostgreSQL when tables are renamed
-- Verify with: \d timing_session_state, \d timing_drivers, etc.

-- ============================================================================
-- STEP 3: Add new columns to timing_sessions
-- ============================================================================

alter table public.timing_sessions
  add column if not exists mode text check (mode in ('practice', 'qualifying', 'race')),
  add column if not exists status text default 'draft' check (status in ('draft', 'scheduled', 'active', 'completed')),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

-- Backfill mode based on existing data (default to 'race')
update public.timing_sessions set mode = 'race' where mode is null;

-- Backfill status based on session state phase
update public.timing_sessions s
set status = case
  when st.phase = 'finished' then 'completed'
  when st.phase = 'race' then 'active'
  when st.phase in ('warmup', 'grid') then 'scheduled'
  else 'draft'
end
from public.timing_session_state st
where st.session_id = s.id and s.status is null;

-- Make mode and status non-nullable after backfill
alter table public.timing_sessions alter column mode set not null;
alter table public.timing_sessions alter column status set not null;

-- ============================================================================
-- STEP 4: Enhance timing_session_state with v2 fields
-- ============================================================================

-- Rename existing columns
alter table public.timing_session_state rename column phase to procedure_phase;
alter table public.timing_session_state rename column track_status to flag_status;

-- Update enum values to match v2 spec
-- procedure_phase: already correct ('setup', 'warmup', 'grid', 'race', 'finished')
-- flag_status: add new values
drop type if exists public.flag_status_v2 cascade;
create type public.flag_status_v2 as enum ('green', 'yellow', 'vsc', 'sc', 'red', 'checkered');

-- Migrate old track_status values to new flag_status
alter table public.timing_session_state
  add column if not exists flag_status_v2 public.flag_status_v2;

update public.timing_session_state
set flag_status_v2 = case flag_status::text
  when 'green' then 'green'::public.flag_status_v2
  when 'yellow' then 'yellow'::public.flag_status_v2
  when 'safety_car' then 'sc'::public.flag_status_v2
  when 'red' then 'red'::public.flag_status_v2
  else 'green'::public.flag_status_v2
end;

alter table public.timing_session_state drop column flag_status;
alter table public.timing_session_state rename column flag_status_v2 to flag_status;
alter table public.timing_session_state alter column flag_status set not null;
alter table public.timing_session_state alter column flag_status set default 'green'::public.flag_status_v2;

-- Add new v2 timing state fields
alter table public.timing_session_state
  add column if not exists is_timing boolean default false,
  add column if not exists race_started_at timestamptz,
  add column if not exists is_paused boolean default false,
  add column if not exists pause_started_at timestamptz,
  add column if not exists accumulated_pause_ms bigint default 0,
  add column if not exists total_laps integer default 0,
  add column if not exists total_duration_ms bigint,
  add column if not exists announcement text;

-- Remove deprecated last_heartbeat column
alter table public.timing_session_state drop column if exists last_heartbeat;

-- ============================================================================
-- STEP 5: Enhance timing_drivers with v2 fields
-- ============================================================================

-- Drop views that depend on timing_drivers.status before modifying it
drop view if exists public.live_driver_gaps cascade;
drop view if exists public.live_driver_standings cascade;

-- Rename existing columns
alter table public.timing_drivers rename column car_number to number;
alter table public.timing_drivers rename column display_name to name;

-- Update driver_status enum to match v2 spec
drop type if exists public.driver_status_v2 cascade;
create type public.driver_status_v2 as enum ('ready', 'active', 'finished', 'retired', 'dnf', 'dns');

-- Migrate old driver_status values to new
alter table public.timing_drivers add column if not exists status_v2 public.driver_status_v2;

update public.timing_drivers
set status_v2 = case status::text
  when 'pending' then 'ready'::public.driver_status_v2
  when 'running' then 'active'::public.driver_status_v2
  when 'dnf' then 'dnf'::public.driver_status_v2
  when 'dsq' then 'dnf'::public.driver_status_v2
  when 'pit' then 'active'::public.driver_status_v2
  else 'ready'::public.driver_status_v2
end;

alter table public.timing_drivers drop column status;
alter table public.timing_drivers rename column status_v2 to status;
alter table public.timing_drivers alter column status set not null;
alter table public.timing_drivers alter column status set default 'ready'::public.driver_status_v2;

-- Add denormalized statistics columns (for performance)
alter table public.timing_drivers
  add column if not exists laps integer default 0,
  add column if not exists last_lap_ms bigint,
  add column if not exists best_lap_ms bigint,
  add column if not exists total_time_ms bigint default 0,
  add column if not exists pits integer default 0,
  add column if not exists current_lap_started_at timestamptz;

-- Backfill denormalized stats from laps table
update public.timing_drivers d
set
  laps = coalesce((select count(*) from public.timing_laps where driver_id = d.id), 0),
  last_lap_ms = (select lap_ms from public.timing_laps where driver_id = d.id order by lap_number desc limit 1),
  best_lap_ms = (select min(lap_ms) from public.timing_laps where driver_id = d.id and lap_ms > 0),
  total_time_ms = coalesce((select sum(lap_ms) from public.timing_laps where driver_id = d.id), 0),
  pits = coalesce((select count(*) from public.pit_events where driver_id = d.id), 0);

-- Remove deprecated columns
alter table public.timing_drivers drop column if exists user_id;
alter table public.timing_drivers drop column if exists starting_position;

-- Recreate unique constraint with new column name
drop index if exists public.drivers_session_car_idx;
create unique index timing_drivers_session_number_idx on public.timing_drivers(session_id, number);

-- ============================================================================
-- STEP 6: Enhance timing_laps with validation fields
-- ============================================================================

alter table public.timing_laps
  add column if not exists invalidated boolean default false,
  add column if not exists checkpoint_missed boolean default false;

-- Change lap_ms from integer to bigint for consistency
alter table public.timing_laps alter column lap_ms type bigint;

-- Recreate unique constraint with new table name
drop index if exists public.laps_unique_per_driver;
create unique index timing_laps_unique_per_driver on public.timing_laps(driver_id, lap_number);

-- Add performance index for session queries
create index if not exists timing_laps_session_driver_idx on public.timing_laps(session_id, driver_id, lap_number);

-- ============================================================================
-- STEP 7: Update timing_events table
-- ============================================================================

-- Rename 'kind' to 'type' to match v2 spec
alter table public.timing_events rename column kind to type;

-- ============================================================================
-- STEP 8: Fix RLS on penalties and pit_events
-- ============================================================================

alter table if exists public.penalties enable row level security;
alter table if exists public.pit_events enable row level security;

-- Add read policies (already exist in migration 0009 but ensure they're present)
do $$
begin
  create policy "Penalties readable" on public.penalties
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Pit events readable" on public.pit_events
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Penalties managed by race control" on public.penalties
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Pit events managed by race control" on public.pit_events
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

-- ============================================================================
-- STEP 9: Update RLS policies to use new table names
-- ============================================================================

-- Drop old policies (they're tied to old table names)
drop policy if exists "Sessions readable" on public.timing_sessions;
drop policy if exists "Session state readable" on public.timing_session_state;
drop policy if exists "Drivers readable" on public.timing_drivers;
drop policy if exists "Laps readable" on public.timing_laps;
drop policy if exists "Race events readable" on public.timing_events;
drop policy if exists "Sessions managed by race control" on public.timing_sessions;
drop policy if exists "Session state managed by race control" on public.timing_session_state;
drop policy if exists "Drivers managed by race control" on public.timing_drivers;
drop policy if exists "Race events managed by race control" on public.timing_events;
drop policy if exists "Laps insert via marshal/race control" on public.timing_laps;

-- Recreate policies with correct table names
create policy "Timing sessions readable" on public.timing_sessions
  for select using (true);

create policy "Timing session state readable" on public.timing_session_state
  for select using (true);

create policy "Timing drivers readable" on public.timing_drivers
  for select using (true);

create policy "Timing laps readable" on public.timing_laps
  for select using (true);

create policy "Timing events readable" on public.timing_events
  for select using (true);

create policy "Timing sessions managed by race control" on public.timing_sessions
  for all using (public.has_permission('race_control'));

create policy "Timing session state managed by race control" on public.timing_session_state
  for all using (public.has_permission('race_control'));

create policy "Timing drivers managed by race control" on public.timing_drivers
  for all using (public.has_permission('race_control'));

create policy "Timing events managed by race control" on public.timing_events
  for all using (
    public.has_permission('race_control') or public.has_permission('marshal')
  );

create policy "Timing laps insert via marshal/race control" on public.timing_laps
  for insert with check (
    public.has_permission('marshal') or public.has_permission('race_control')
  );

-- ============================================================================
-- STEP 10: Update views to use new table names
-- ============================================================================

drop view if exists public.live_driver_gaps;
drop view if exists public.live_driver_standings;

create or replace view public.live_driver_standings as
select
  d.session_id,
  d.id as driver_id,
  d.name as driver_name,
  d.team_name,
  d.number as car_number,
  d.laps as laps_completed,
  d.best_lap_ms,
  d.last_lap_ms,
  d.total_time_ms,
  d.status,
  row_number() over (
    partition by d.session_id
    order by d.laps desc,
             d.total_time_ms asc nulls last,
             d.created_at asc
  ) as position
from public.timing_drivers d;

create or replace view public.live_driver_gaps as
select
  standings.*,
  (standings.total_time_ms - first_value(standings.total_time_ms)
    over (partition by standings.session_id order by standings.position)) as gap_to_leader_ms
from public.live_driver_standings standings;

-- ============================================================================
-- STEP 11: Update RPCs with v2 signatures and behavior
-- ============================================================================

-- RPC: timing_create_session (v2)
create or replace function public.timing_create_session(
  p_input jsonb
) returns public.timing_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  session_row public.timing_sessions;
  v_name text;
  v_mode text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_drivers jsonb;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  -- Extract fields from jsonb input
  v_name := p_input->>'name';
  v_mode := coalesce(p_input->>'mode', 'race');
  v_starts_at := (p_input->>'starts_at')::timestamptz;
  v_ends_at := (p_input->>'ends_at')::timestamptz;
  v_drivers := coalesce(p_input->'drivers', '[]'::jsonb);

  if v_name is null or trim(v_name) = '' then
    raise exception 'Session name is required';
  end if;

  if v_mode not in ('practice', 'qualifying', 'race') then
    raise exception 'Invalid mode. Must be practice, qualifying, or race';
  end if;

  -- Create session
  insert into public.timing_sessions(name, mode, status, starts_at, ends_at, created_by)
  values (v_name, v_mode, 'draft', v_starts_at, v_ends_at, actor)
  returning * into session_row;

  -- Initialize session state with v2 defaults
  insert into public.timing_session_state(
    session_id,
    procedure_phase,
    flag_status,
    is_timing,
    race_time_ms,
    is_paused,
    accumulated_pause_ms,
    total_laps
  ) values (
    session_row.id,
    'setup'::public.session_phase,
    'green'::public.flag_status_v2,
    false,
    0,
    false,
    0,
    0
  );

  -- Create drivers from input array
  if jsonb_typeof(v_drivers) = 'array' and jsonb_array_length(v_drivers) > 0 then
    insert into public.timing_drivers(
      session_id,
      number,
      name,
      team_name,
      team_color,
      status,
      laps,
      total_time_ms,
      pits
    )
    select
      session_row.id,
      coalesce((driver->>'number')::integer, (row_number() over ())::integer),
      coalesce(driver->>'name', format('Driver %s', row_number() over ())),
      coalesce(driver->>'team_name', 'Privateer'),
      driver->>'team_color',
      'ready'::public.driver_status_v2,
      0,
      0,
      0
    from jsonb_array_elements(v_drivers) as driver;
  end if;

  -- Log event
  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    session_row.id,
    'session_created',
    jsonb_build_object('name', v_name, 'mode', v_mode),
    actor
  );

  return session_row;
end;
$$;

-- RPC: timing_update_session_state (v2 with jsonb patch)
create or replace function public.timing_update_session_state(
  p_session_id uuid,
  p_patch jsonb
) returns public.timing_session_state
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  state_row public.timing_session_state;
  v_changes jsonb := '{}'::jsonb;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  -- Verify session state exists
  if not exists (select 1 from public.timing_session_state where session_id = p_session_id) then
    raise exception 'Session state not found for session %', p_session_id;
  end if;

  -- Apply allowed patches
  update public.timing_session_state
  set
    procedure_phase = coalesce(
      (p_patch->>'procedure_phase')::public.session_phase,
      procedure_phase
    ),
    flag_status = coalesce(
      (p_patch->>'flag_status')::public.flag_status_v2,
      flag_status
    ),
    is_timing = coalesce(
      (p_patch->>'is_timing')::boolean,
      is_timing
    ),
    race_time_ms = coalesce(
      (p_patch->>'race_time_ms')::bigint,
      race_time_ms
    ),
    race_started_at = coalesce(
      (p_patch->>'race_started_at')::timestamptz,
      race_started_at
    ),
    is_paused = coalesce(
      (p_patch->>'is_paused')::boolean,
      is_paused
    ),
    pause_started_at = coalesce(
      (p_patch->>'pause_started_at')::timestamptz,
      pause_started_at
    ),
    accumulated_pause_ms = coalesce(
      (p_patch->>'accumulated_pause_ms')::bigint,
      accumulated_pause_ms
    ),
    total_laps = coalesce(
      (p_patch->>'total_laps')::integer,
      total_laps
    ),
    total_duration_ms = coalesce(
      (p_patch->>'total_duration_ms')::bigint,
      total_duration_ms
    ),
    announcement = coalesce(
      p_patch->>'announcement',
      announcement
    )
  where session_id = p_session_id
  returning * into state_row;

  -- Log the state change
  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'state_updated',
    p_patch,
    actor
  );

  return state_row;
end;
$$;

-- RPC: timing_initialize_race (v2)
create or replace function public.timing_initialize_race(
  p_session_id uuid
) returns public.timing_session_state
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  state_row public.timing_session_state;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  -- Update session state to race phase
  update public.timing_session_state
  set
    procedure_phase = 'race'::public.session_phase,
    is_timing = true,
    race_started_at = now(),
    race_time_ms = 0
  where session_id = p_session_id
  returning * into state_row;

  -- Update all drivers to active status and set current lap start time
  update public.timing_drivers
  set
    status = 'active'::public.driver_status_v2,
    current_lap_started_at = now()
  where session_id = p_session_id
    and status = 'ready'::public.driver_status_v2;

  -- Update session status to active
  update public.timing_sessions
  set status = 'active'
  where id = p_session_id;

  -- Log event
  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'race_initialized',
    jsonb_build_object('race_started_at', now()),
    actor
  );

  return state_row;
end;
$$;

-- RPC: timing_log_lap (v2 with validation and concurrency safety)
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
  min_lap_ms constant bigint := 20000;  -- 20 seconds
  max_lap_ms constant bigint := 600000; -- 10 minutes
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('marshal') and not public.has_permission('race_control') then
    raise exception 'Requires marshal or race control permission';
  end if;

  -- Validation
  if p_lap_time_ms <= 0 then
    raise exception 'Lap time must be positive';
  end if;

  if p_lap_time_ms < min_lap_ms then
    raise exception 'Lap time too fast (minimum % ms)', min_lap_ms;
  end if;

  if p_lap_time_ms > max_lap_ms then
    raise exception 'Lap time too slow (maximum % ms)', max_lap_ms;
  end if;

  -- Lock driver row for update (concurrency safety)
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

  -- Determine next lap number
  select coalesce(max(lap_number), 0) + 1
  into next_lap_number
  from public.timing_laps
  where driver_id = p_driver_id;

  -- Insert lap record
  insert into public.timing_laps(
    session_id,
    driver_id,
    lap_number,
    lap_time_ms,
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

  -- Update driver denormalized statistics
  update public.timing_drivers
  set
    laps = laps + 1,
    last_lap_ms = p_lap_time_ms,
    best_lap_ms = least(coalesce(best_lap_ms, p_lap_time_ms), p_lap_time_ms),
    total_time_ms = total_time_ms + p_lap_time_ms,
    current_lap_started_at = now()
  where id = p_driver_id
  returning * into driver_record;

  -- Log event
  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'lap_logged',
    jsonb_build_object(
      'driver_id', p_driver_id,
      'lap_number', next_lap_number,
      'lap_time_ms', p_lap_time_ms
    ),
    actor
  );

  -- Return both lap and updated driver data
  return jsonb_build_object(
    'lap', row_to_json(lap_record),
    'driver', row_to_json(driver_record)
  );
end;
$$;

-- ============================================================================
-- STEP 12: Grant execute permissions on RPCs
-- ============================================================================

grant execute on function public.timing_create_session(jsonb) to authenticated;
grant execute on function public.timing_update_session_state(uuid, jsonb) to authenticated;
grant execute on function public.timing_initialize_race(uuid) to authenticated;
grant execute on function public.timing_log_lap(uuid, uuid, bigint) to authenticated;

-- ============================================================================
-- Migration complete!
-- ============================================================================
