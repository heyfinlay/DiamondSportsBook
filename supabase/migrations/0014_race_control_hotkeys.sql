-- Race control enhancements: auto lap logging, track status controls, control log view, driver status updates

-- Ensure flag enum contains required statuses
do $$
begin
  if not exists (select 1 from pg_type where typname = 'flag_status_v2') then
    create type public.flag_status_v2 as enum ('green', 'yellow', 'vsc', 'sc', 'red', 'checkered');
  end if;
exception
  when duplicate_object then null;
end;
$$;

-- Auto lap logging RPC that derives lap time from driver lap start timestamps
create or replace function public.timing_log_lap_auto(
  p_driver_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  driver_record public.timing_drivers;
  state_record public.timing_session_state;
  lap_time bigint;
  lap_start timestamptz;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('marshal') and not public.has_permission('race_control') then
    raise exception 'Requires marshal or race control permission';
  end if;

  select * into driver_record
  from public.timing_drivers
  where id = p_driver_id
  for update;

  if driver_record is null then
    raise exception 'Driver not found';
  end if;

  select * into state_record
  from public.timing_session_state
  where session_id = driver_record.session_id;

  lap_start := coalesce(driver_record.current_lap_started_at, state_record.race_started_at);
  if lap_start is null then
    lap_start := now();
    update public.timing_drivers
    set current_lap_started_at = lap_start
    where id = p_driver_id;
    raise exception 'Lap timer not initialized for driver %', driver_record.number;
  end if;

  lap_time := greatest(1, (extract(epoch from (now() - lap_start)) * 1000)::bigint);

  return public.timing_log_lap(driver_record.session_id, p_driver_id, lap_time);
end;
$$;

-- Pit event RPC aligned to v2 drivers table
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

-- Track flag setter RPC
create or replace function public.timing_set_flag_status(
  p_session_id uuid,
  p_flag public.flag_status_v2
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

  update public.timing_session_state
  set flag_status = p_flag
  where session_id = p_session_id
  returning * into state_row;

  if not found then
    raise exception 'Session state not found';
  end if;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'flag_changed',
    jsonb_build_object('flag', p_flag),
    actor
  );

  return state_row;
end;
$$;

-- Driver status update RPC (for retire/DNF etc.)
create or replace function public.timing_update_driver_status(
  p_driver_id uuid,
  p_status public.driver_status_v2,
  p_reason text default null
) returns public.timing_drivers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  driver_row public.timing_drivers;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  update public.timing_drivers
  set status = p_status
  where id = p_driver_id
  returning * into driver_row;

  if not found then
    raise exception 'Driver not found';
  end if;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    driver_row.session_id,
    'driver_status_changed',
    jsonb_build_object('driver_id', p_driver_id, 'status', p_status, 'reason', p_reason),
    actor
  );

  return driver_row;
end;
$$;

-- Pause / resume RPCs for race clock control
create or replace function public.timing_pause_race(p_session_id uuid)
returns public.timing_session_state
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

  update public.timing_session_state
  set is_paused = true,
      is_timing = false,
      pause_started_at = now()
  where session_id = p_session_id
  returning * into state_row;

  if not found then
    raise exception 'Session state not found';
  end if;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (p_session_id, 'race_paused', jsonb_build_object(), actor);

  return state_row;
end;
$$;

create or replace function public.timing_resume_race(p_session_id uuid)
returns public.timing_session_state
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  state_row public.timing_session_state;
  pause_delta bigint;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  select * into state_row
  from public.timing_session_state
  where session_id = p_session_id
  for update;

  if state_row.pause_started_at is null then
    raise exception 'Session is not paused';
  end if;

  pause_delta := greatest(
    0,
    (extract(epoch from (now() - state_row.pause_started_at)) * 1000)::bigint
  );

  update public.timing_session_state
  set
    is_paused = false,
    is_timing = true,
    pause_started_at = null,
    accumulated_pause_ms = coalesce(accumulated_pause_ms, 0) + pause_delta
  where session_id = p_session_id
  returning * into state_row;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (p_session_id, 'race_resumed', jsonb_build_object(), actor);

  return state_row;
end;
$$;

-- Control log view (subset of timing events relevant to race control)
create or replace function public.timing_log_control_error(
  p_session_id uuid,
  p_message text
) returns public.timing_events
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  event_row public.timing_events;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'control_error',
    jsonb_build_object('message', coalesce(trim(p_message), 'unknown error')),
    actor
  )
  returning * into event_row;

  return event_row;
end;
$$;

create or replace function public.timing_get_race_time(p_session_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  state_row public.timing_session_state;
  effective_now timestamptz;
  base_ms bigint;
  pause_ms bigint;
begin
  select * into state_row
  from public.timing_session_state
  where session_id = p_session_id;

  if state_row is null or state_row.race_started_at is null then
    return 0;
  end if;

  if state_row.is_paused and state_row.pause_started_at is not null then
    effective_now := state_row.pause_started_at;
  else
    effective_now := now();
  end if;

  base_ms := greatest(
    0,
    (extract(epoch from (effective_now - state_row.race_started_at)) * 1000)::bigint
  );

  pause_ms := coalesce(state_row.accumulated_pause_ms, 0);

  return greatest(0, base_ms - pause_ms);
end;
$$;

create or replace view public.race_control_events as
select
  id,
  session_id,
  type,
  payload,
  created_at,
  created_by
from public.timing_events
where type in (
  'flag_changed',
  'penalty_logged',
  'pit_event_logged',
  'lap_invalidated',
  'lap_logged',
  'race_paused',
  'race_resumed',
  'driver_status_changed',
  'control_error',
  'state_updated'
)
order by created_at desc;

grant select on public.race_control_events to authenticated;
grant execute on function public.timing_log_lap_auto(uuid) to authenticated;
grant execute on function public.timing_set_flag_status(uuid, public.flag_status_v2) to authenticated;
grant execute on function public.timing_update_driver_status(uuid, public.driver_status_v2, text) to authenticated;
grant execute on function public.timing_pause_race(uuid) to authenticated;
grant execute on function public.timing_resume_race(uuid) to authenticated;
grant execute on function public.timing_log_control_error(uuid, text) to authenticated;
grant execute on function public.timing_get_race_time(uuid) to authenticated;
