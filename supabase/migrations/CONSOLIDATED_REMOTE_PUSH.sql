-- ============================================================================
-- CONSOLIDATED MIGRATION FOR REMOTE SUPABASE DATABASE
-- ============================================================================
--
-- This file contains all pending migrations that need to be applied to your
-- remote Supabase database.
--
-- HOW TO USE:
-- 1. Go to: https://supabase.com/dashboard/project/efqjrzrqkacdkvchtyed
-- 2. Navigate to: SQL Editor
-- 3. Click: "New Query"
-- 4. Copy and paste this ENTIRE file
-- 5. Click: "Run" (or press Cmd/Ctrl + Enter)
--
-- INCLUDES:
-- - 0007_betting_phase1.sql (Betting enhancements)
-- - 0008_function_grants.sql (Function permissions)
-- - 0009_timing_phase2.sql (Timing improvements)
-- - 0010_wallet_phase2.sql (Wallet enhancements)
-- - 0011_timing_v2_enhancements.sql (⭐ TIMING V2 - MOST IMPORTANT)
-- - 0012_user_roles_table.sql (Multi-role support)
--
-- ESTIMATED TIME: 30-60 seconds
--
-- ============================================================================

-- ============================================================================
-- MIGRATION 0007: Betting Phase 1
-- ============================================================================

-- Betting Phase 3 Enhancements

-- Grants for betting admin operations
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.markets to authenticated;
grant select, insert, update on public.outcomes to authenticated;

-- Policy: wagers insert requires authenticated user (wallet RPC already checks permissions)
do $$
begin
  create policy "Wagers insert authenticated" on public.wagers
    for insert
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end;
$$;

-- RPC to create event + markets
create or replace function public.betting_create_event_and_markets(
  p_title text,
  p_session_id uuid,
  p_takeout numeric,
  p_markets jsonb
) returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  event_row public.events;
  market_item jsonb;
  market_row public.markets;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('betting_admin') then
    raise exception 'Requires betting admin permission';
  end if;

  insert into public.events(title, session_id, takeout, created_by)
  values (p_title, p_session_id, p_takeout, actor)
  returning * into event_row;

  for market_item in select * from jsonb_array_elements(p_markets)
  loop
    insert into public.markets(
      event_id,
      name,
      description,
      min_stake,
      max_stake,
      close_time
    )
    values (
      event_row.id,
      market_item->>'name',
      market_item->>'description',
      coalesce((market_item->>'min_stake')::numeric, 10),
      coalesce((market_item->>'max_stake')::numeric, 10000),
      (market_item->>'close_time')::timestamptz
    )
    returning * into market_row;

    insert into public.outcomes(market_id, label, driver_id, metadata)
    select
      market_row.id,
      outcome->>'label',
      (outcome->>'driver_id')::uuid,
      coalesce(outcome->'metadata', '{}'::jsonb)
    from jsonb_array_elements(coalesce(market_item->'outcomes', '[]'::jsonb)) as outcome;
  end loop;

  return event_row;
end;
$$;

-- Simple status change RPCs
create or replace function public.betting_open_market(p_market_id uuid)
returns public.markets
language sql
security definer
set search_path = public
as $$
  update public.markets
  set status = 'open'
  where id = p_market_id
  returning *;
$$;

create or replace function public.betting_close_market(p_market_id uuid)
returns public.markets
language sql
security definer
set search_path = public
as $$
  update public.markets
  set status = 'closed'
  where id = p_market_id
  returning *;
$$;

create or replace function public.betting_suspend_market(p_market_id uuid)
returns public.markets
language sql
security definer
set search_path = public
as $$
  update public.markets
  set status = 'suspended'
  where id = p_market_id
  returning *;
$$;

-- ============================================================================
-- MIGRATION 0008: Function Grants
-- ============================================================================

-- Centralize function grants to keep earlier migrations compatible with Supabase CLI.
-- Note: Some functions may not exist yet if their migrations haven't run.
-- Use DO blocks to grant permissions safely.

do $$
begin
  grant execute on function public.timing_update_session_state(uuid, public.session_phase, public.track_status, bigint) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_create_session(text, text, integer, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_initialize_race(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_log_lap(uuid, integer, integer) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_invalidate_last_lap(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_log_penalty(uuid, uuid, text, integer) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_log_pit_event(uuid, integer) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_delete_session_deep(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_preview_wager(uuid, uuid, numeric) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_place_wager(uuid, uuid, numeric, text) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_settle_market(uuid, uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_create_event_and_markets(text, uuid, numeric, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_open_market(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_close_market(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_suspend_market(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_credit(uuid, numeric, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_debit(uuid, numeric, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_request_deposit(numeric) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_request_withdrawal(numeric) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_approve_withdrawal(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_reject_withdrawal(uuid, text) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_approve_deposit(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

-- ============================================================================
-- MIGRATION 0009: Timing Phase 2
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 0010: Wallet Phase 2
-- ============================================================================

-- Wallet Phase 2: capture rejection reasons for withdrawals.

alter table if exists public.withdrawals
  add column if not exists admin_note text;

drop function if exists public.wallet_reject_withdrawal(uuid);

create or replace function public.wallet_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  withdrawal_row record;
  refund_meta jsonb := jsonb_build_object('reason', 'withdrawal_rejected');
  normalized_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('betting_admin') then
    raise exception 'Requires admin permission';
  end if;

  select w.*, wa.user_id
  into withdrawal_row
  from public.withdrawals w
  join public.wallet_accounts wa on wa.id = w.account_id
  where w.id = p_withdrawal_id
  for update;

  if withdrawal_row.id is null then
    raise exception 'Withdrawal not found';
  end if;

  if withdrawal_row.status <> 'requested' then
    raise exception 'Withdrawal already processed';
  end if;

  if normalized_reason is not null then
    refund_meta := jsonb_set(refund_meta, '{note}', to_jsonb(normalized_reason));
  end if;

  perform public.wallet_credit(
    withdrawal_row.user_id,
    withdrawal_row.amount,
    refund_meta
  );

  update public.withdrawals
  set status = 'rejected',
      processed_at = now(),
      processed_by = actor,
      admin_note = coalesce(normalized_reason, admin_note)
  where id = p_withdrawal_id;
end;
$$;

-- ============================================================================
-- MIGRATION 0011: Timing V2 Enhancements ⭐ MOST IMPORTANT
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 0012: User Roles Table
-- ============================================================================

-- Add user_roles table for multiple role support
-- This extends the existing profiles.role system to allow users to have multiple roles

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

-- Only super_admins can modify roles
create policy "Super admins can manage roles"
  on public.user_roles
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Grant permissions
grant select on public.user_roles to authenticated;

-- Update has_permission function to check both profiles.role and user_roles
create or replace function public.has_permission(target_permission text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  has_multi_role boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into actor
  from public.profiles
  where id = auth.uid();

  if not found then
    return false;
  end if;

  -- Super admin has all permissions
  if actor.role = 'super_admin' then
    return true;
  end if;

  if target_permission is null then
    return false;
  end if;

  -- Check primary role in profiles table
  if target_permission = actor.role::text then
    return true;
  end if;

  -- Check permissions array in profiles table
  if target_permission = any(actor.permissions) then
    return true;
  end if;

  -- Check user_roles table for additional roles
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = target_permission
  ) into has_multi_role;

  return has_multi_role;
end;
$$;

-- Migrate existing profiles.role to user_roles for consistency
-- This allows users to have their primary role in both places
insert into public.user_roles (user_id, role)
select id, role::text
from public.profiles
where role is not null
on conflict (user_id, role) do nothing;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- All migrations have been applied. You can now:
-- 1. Close this SQL editor
-- 2. Verify tables exist in the Table Editor
-- 3. Check that your app can connect to the remote database
--
-- Next steps:
-- - Update your .env with remote Supabase credentials
-- - Test the Timing V2 RPCs from your app
-- - Create a test session using timing_create_session
-- ============================================================================
