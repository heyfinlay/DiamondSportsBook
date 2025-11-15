-- Phase 1 Timing Upgrades: RLS + RPC surface

-- Enable RLS on timing tables
alter table if exists public.sessions enable row level security;
alter table if exists public.session_state enable row level security;
alter table if exists public.drivers enable row level security;
alter table if exists public.laps enable row level security;
alter table if exists public.race_events enable row level security;
alter table if exists public.session_members enable row level security;

-- Basic read policies (spectators can read timing data)
create policy if not exists "Sessions readable" on public.sessions
  for select using (true);

create policy if not exists "Session state readable" on public.session_state
  for select using (true);

create policy if not exists "Drivers readable" on public.drivers
  for select using (true);

create policy if not exists "Laps readable" on public.laps
  for select using (true);

create policy if not exists "Race events readable" on public.race_events
  for select using (true);

-- Mutations require race control / marshal permissions
create policy if not exists "Sessions managed by race control" on public.sessions
  for all using (public.has_permission('race_control'));

create policy if not exists "Session state managed by race control" on public.session_state
  for all using (public.has_permission('race_control'));

create policy if not exists "Drivers managed by race control" on public.drivers
  for all using (public.has_permission('race_control'));

create policy if not exists "Race events managed by race control" on public.race_events
  for all using (
    public.has_permission('race_control') or public.has_permission('marshal')
  );

create policy if not exists "Laps insert via marshal/race control" on public.laps
  for insert using (
    public.has_permission('marshal') or public.has_permission('race_control')
  );

-- Session members only editable by race control
create policy if not exists "Session members readable" on public.session_members
  for select using (true);

create policy if not exists "Session members managed" on public.session_members
  for all using (public.has_permission('race_control'));

-- RPC: timing_create_session
create or replace function public.timing_create_session(
  p_name text,
  p_track_name text,
  p_laps_target integer default null,
  p_drivers jsonb default '[]'::jsonb
) returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  session_row public.sessions;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  insert into public.sessions(name, track_name, laps_target, created_by)
  values (p_name, p_track_name, p_laps_target, actor)
  returning * into session_row;

  insert into public.session_state(session_id)
  values (session_row.id);

  if p_drivers is not null and jsonb_typeof(p_drivers) = 'array' then
    with driver_rows as (
      select idx, body
      from jsonb_array_elements(p_drivers) with ordinality as arr(body, idx)
    )
    insert into public.drivers(session_id, display_name, team_name, car_number, status)
    select
      session_row.id,
      coalesce(body->>'display_name', format('Driver %s', idx)),
      coalesce(body->>'team_name', 'Privateer'),
      coalesce(nullif(body->>'car_number', '')::integer, idx),
      'pending'
    from driver_rows;
  end if;

  insert into public.race_events(session_id, kind, payload, created_by)
  values (session_row.id, 'session_created', jsonb_build_object('name', p_name), actor);

  return session_row;
end;
$$;

grant execute on function public.timing_create_session(text, text, integer, jsonb) to authenticated;

-- RPC: timing_initialize_race
create or replace function public.timing_initialize_race(p_session_id uuid)
returns public.session_state
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  state_row public.session_state;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  update public.session_state
  set phase = 'race',
      race_time_ms = 0,
      last_heartbeat = now()
  where session_id = p_session_id
  returning * into state_row;

  with ordered as (
    select id,
           row_number() over (order by coalesce(starting_position, car_number, 999)) as start_pos
    from public.drivers
    where session_id = p_session_id
  )
  update public.drivers d
  set status = 'running',
      starting_position = ordered.start_pos
  from ordered
  where d.id = ordered.id
    and d.session_id = p_session_id;

  insert into public.race_events(session_id, kind, payload, created_by)
  values (p_session_id, 'race_initialized', jsonb_build_object('session_id', p_session_id), actor);

  return state_row;
end;
$$;

grant execute on function public.timing_initialize_race(uuid) to authenticated;

-- Replace timing_log_lap_atomic with canonical verb name
drop function if exists public.timing_log_lap_atomic(uuid, integer, integer);

create or replace function public.timing_log_lap(
  p_driver_id uuid,
  p_lap_number integer,
  p_lap_ms integer
) returns public.laps
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  lap_record public.laps;
  driver_session uuid;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('marshal') and not public.has_permission('race_control') then
    raise exception 'Requires marshal or race control permission';
  end if;

  select session_id into driver_session from public.drivers where id = p_driver_id;
  if driver_session is null then
    raise exception 'Driver not found';
  end if;

  insert into public.laps(session_id, driver_id, lap_number, lap_ms, recorded_by)
  values (driver_session, p_driver_id, p_lap_number, p_lap_ms, actor)
  returning * into lap_record;

  insert into public.race_events(session_id, kind, payload, created_by)
  values (
    driver_session,
    'lap_logged',
    jsonb_build_object('driver_id', p_driver_id, 'lap_number', p_lap_number, 'lap_ms', p_lap_ms),
    actor
  );

  return lap_record;
end;
$$;

grant execute on function public.timing_log_lap(uuid, integer, integer) to authenticated;
