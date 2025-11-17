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
  'race_paused',
  'race_resumed',
  'driver_status_changed',
  'state_updated'
)
order by created_at desc;

grant select on public.race_control_events to authenticated;
grant execute on function public.timing_log_lap_auto(uuid) to authenticated;
grant execute on function public.timing_set_flag_status(uuid, public.flag_status_v2) to authenticated;
grant execute on function public.timing_update_driver_status(uuid, public.driver_status_v2, text) to authenticated;
grant execute on function public.timing_pause_race(uuid) to authenticated;
grant execute on function public.timing_resume_race(uuid) to authenticated;
