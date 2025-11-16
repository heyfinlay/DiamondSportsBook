-- Phase 1 Timing Upgrades: RLS + RPC surface

-- Enable RLS on timing tables
alter table if exists public.sessions enable row level security;
alter table if exists public.session_state enable row level security;
alter table if exists public.drivers enable row level security;
alter table if exists public.laps enable row level security;
alter table if exists public.race_events enable row level security;
alter table if exists public.session_members enable row level security;

-- Basic read policies (spectators can read timing data)
do $$
begin
  create policy "Sessions readable" on public.sessions
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Session state readable" on public.session_state
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Drivers readable" on public.drivers
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Laps readable" on public.laps
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Race events readable" on public.race_events
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

-- Mutations require race control / marshal permissions
do $$
begin
  create policy "Sessions managed by race control" on public.sessions
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Session state managed by race control" on public.session_state
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Drivers managed by race control" on public.drivers
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Race events managed by race control" on public.race_events
    for all using (
      public.has_permission('race_control') or public.has_permission('marshal')
    );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Laps insert via marshal/race control" on public.laps
    for insert with check (
      public.has_permission('marshal') or public.has_permission('race_control')
    );
exception
  when duplicate_object then null;
end;
$$;

-- Session members only editable by race control
do $$
begin
  create policy "Session members readable" on public.session_members
    for select using (true);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy "Session members managed" on public.session_members
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

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
