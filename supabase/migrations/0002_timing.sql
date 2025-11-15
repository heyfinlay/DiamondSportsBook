-- Timing Domain Schema

drop type if exists public.session_phase cascade;
drop type if exists public.track_status cascade;
drop type if exists public.driver_status cascade;

create type public.session_phase as enum ('setup', 'warmup', 'grid', 'race', 'finished');
create type public.track_status as enum ('green', 'yellow', 'safety_car', 'red');
create type public.driver_status as enum ('pending', 'running', 'pit', 'dnf', 'dsq');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  track_name text not null,
  laps_target integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.session_state (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  phase public.session_phase not null default 'setup',
  track_status public.track_status not null default 'green',
  race_time_ms bigint not null default 0,
  last_heartbeat timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  team_name text not null,
  car_number integer not null,
  status public.driver_status not null default 'pending',
  starting_position integer,
  created_at timestamptz not null default now()
);

create unique index drivers_session_car_idx on public.drivers(session_id, car_number);

create table public.laps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  lap_number integer not null,
  lap_ms integer not null,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index laps_unique_per_driver on public.laps(driver_id, lap_number);

create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  driver_id uuid references public.drivers(id),
  reason text not null,
  seconds integer not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id)
);

create table public.pit_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  driver_id uuid not null references public.drivers(id),
  started_at timestamptz not null default now(),
  duration_ms integer,
  created_by uuid references auth.users(id)
);

create table public.race_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('marshal', 'race_control')),
  created_at timestamptz not null default now()
);

-- Live standings view
create or replace view public.live_driver_standings as
select
  d.session_id,
  d.id as driver_id,
  d.display_name as driver_name,
  d.team_name,
  d.car_number,
  coalesce(max(l.lap_number), 0) as laps_completed,
  min(l.lap_ms) filter (where l.lap_ms > 0) as best_lap_ms,
  (array_agg(l.lap_ms order by l.lap_number desc))[1] as last_lap_ms,
  sum(l.lap_ms) as total_time_ms,
  d.status,
  row_number() over (
    partition by d.session_id
    order by coalesce(max(l.lap_number), 0) desc,
             sum(l.lap_ms) asc nulls last,
             d.created_at asc
  ) as position
from public.drivers d
left join public.laps l on l.driver_id = d.id
group by d.session_id, d.id;

-- Gaps to leader as a convenience view
create or replace view public.live_driver_gaps as
select
  standings.*,
  (standings.total_time_ms - first_value(standings.total_time_ms)
    over (partition by standings.session_id order by standings.position)) as gap_to_leader_ms
from public.live_driver_standings standings;

-- Timing RPCs
create or replace function public.timing_update_session_state(
  p_session_id uuid,
  p_phase public.session_phase,
  p_track_status public.track_status,
  p_race_time_ms bigint
) returns public.session_state
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.session_state%rowtype;
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  update public.session_state
    set phase = coalesce(p_phase, phase),
        track_status = coalesce(p_track_status, track_status),
        race_time_ms = coalesce(p_race_time_ms, race_time_ms),
        last_heartbeat = now()
  where session_id = p_session_id
  returning * into strict result;

  return result;
end;
$$;

grant execute on function public.timing_update_session_state(uuid, public.session_phase, public.track_status, bigint) to authenticated;

create or replace function public.timing_log_lap_atomic(
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
    raise exception 'Requires marshal permission';
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

grant execute on function public.timing_log_lap_atomic(uuid, integer, integer) to authenticated;
