-- Timing Phase 2: cover penalty & pit logging plus admin cleanup verbs.

-- Ensure timing audit tables follow the same RLS posture as the rest of the domain.
alter table if exists public.penalties enable row level security;
alter table if exists public.pit_events enable row level security;

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
  create policy "Penalties managed by race control" on public.penalties
    for all using (public.has_permission('race_control'));
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
  create policy "Pit events managed by race control" on public.pit_events
    for all using (public.has_permission('race_control'));
exception
  when duplicate_object then null;
end;
$$;

-- RPC: invalidate the most recent lap for a driver.
create or replace function public.timing_invalidate_last_lap(p_driver_id uuid)
returns public.laps
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  lap_row public.laps;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  select *
  into lap_row
  from public.laps
  where driver_id = p_driver_id
  order by lap_number desc, created_at desc
  limit 1;

  if lap_row.id is null then
    raise exception 'No laps to invalidate';
  end if;

  delete from public.laps
  where id = lap_row.id;

  insert into public.race_events(session_id, kind, payload, created_by)
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

-- RPC: log a time penalty for a session/driver.
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
    select session_id
    into driver_session
    from public.drivers
    where id = p_driver_id;

    if driver_session is null or driver_session <> p_session_id then
      raise exception 'Driver does not belong to session';
    end if;
  end if;

  insert into public.penalties(session_id, driver_id, reason, seconds, issued_by)
  values (p_session_id, p_driver_id, trim(p_reason), p_seconds, actor)
  returning * into penalty_row;

  insert into public.race_events(session_id, kind, payload, created_by)
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

-- RPC: record a pit event.
create or replace function public.timing_log_pit_event(
  p_driver_id uuid,
  p_duration_ms integer default null
) returns public.pit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  pit_row public.pit_events;
  driver_session uuid;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') and not public.has_permission('marshal') then
    raise exception 'Requires marshal or race control permission';
  end if;

  select session_id
  into driver_session
  from public.drivers
  where id = p_driver_id;

  if driver_session is null then
    raise exception 'Driver not found';
  end if;

  insert into public.pit_events(session_id, driver_id, duration_ms, created_by)
  values (driver_session, p_driver_id, p_duration_ms, actor)
  returning * into pit_row;

  insert into public.race_events(session_id, kind, payload, created_by)
  values (
    driver_session,
    'pit_event_logged',
    jsonb_build_object(
      'driver_id', p_driver_id,
      'duration_ms', p_duration_ms
    ),
    actor
  );

  return pit_row;
end;
$$;

-- RPC: deep delete of a session (admin only).
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

  if not public.has_permission('super_admin') then
    raise exception 'Requires super admin permission';
  end if;

  delete from public.sessions
  where id = p_session_id;
end;
$$;
