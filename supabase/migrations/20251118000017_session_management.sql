-- Session management enhancements: final classifications and finish RPC

create table if not exists public.timing_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.timing_sessions(id) on delete cascade,
  driver_id uuid not null references public.timing_drivers(id) on delete cascade,
  position integer not null,
  laps integer not null,
  total_time_ms bigint,
  gap_ms bigint,
  gap_laps integer,
  status public.driver_status_v2 not null,
  created_at timestamptz not null default now()
);

create index if not exists timing_results_session_idx on public.timing_results(session_id);

create or replace function public.timing_finish_session(p_session_id uuid)
returns setof public.timing_results
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  rec record;
  pos integer := 0;
  leader_laps integer := 0;
  leader_time bigint := null;
  gap_ms bigint;
  gap_laps integer;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('race_control') then
    raise exception 'Requires race control permission';
  end if;

  delete from public.timing_results where session_id = p_session_id;

  for rec in
    select id as driver_id, laps, total_time_ms, status
    from public.timing_drivers
    where session_id = p_session_id
    order by laps desc, total_time_ms asc nulls last, created_at asc
  loop
    pos := pos + 1;
    if pos = 1 then
      leader_laps := coalesce(rec.laps, 0);
      leader_time := rec.total_time_ms;
    end if;

    gap_laps := leader_laps - coalesce(rec.laps, 0);
    if gap_laps = 0 and leader_time is not null and rec.total_time_ms is not null then
      gap_ms := greatest(0, rec.total_time_ms - leader_time);
    else
      gap_ms := null;
    end if;

    insert into public.timing_results(
      session_id,
      driver_id,
      position,
      laps,
      total_time_ms,
      gap_ms,
      gap_laps,
      status
    )
    values (
      p_session_id,
      rec.driver_id,
      pos,
      coalesce(rec.laps, 0),
      rec.total_time_ms,
      gap_ms,
      gap_laps,
      rec.status
    );
  end loop;

  update public.timing_session_state
  set
    procedure_phase = 'finished'::public.session_phase,
    is_timing = false,
    is_paused = true,
    flag_status = 'checkered'::public.flag_status_v2
  where session_id = p_session_id;

  update public.timing_sessions
  set status = 'finished'
  where id = p_session_id;

  insert into public.timing_events(session_id, type, payload, created_by)
  values (
    p_session_id,
    'race_finished',
    jsonb_build_object('results_count', pos),
    actor
  );

  return query
    select * from public.timing_results
    where session_id = p_session_id
    order by position asc;
end;
$$;

grant select on public.timing_results to authenticated;
grant execute on function public.timing_finish_session(uuid) to authenticated;
