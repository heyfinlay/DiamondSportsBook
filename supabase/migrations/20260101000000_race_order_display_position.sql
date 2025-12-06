-- Add manual race order support
alter table public.timing_drivers
  add column if not exists display_position integer;

-- Refresh views to expose the manual display position while keeping existing ordering logic
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
  d.display_position,
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
