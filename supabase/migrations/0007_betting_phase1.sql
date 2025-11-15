-- Betting Phase 3 Enhancements

-- Grants for betting admin operations
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.markets to authenticated;
grant select, insert, update on public.outcomes to authenticated;

-- Policy: wagers insert requires authenticated user (wallet RPC already checks permissions)
create policy "Wagers insert authenticated" on public.wagers
  for insert
  with check (auth.uid() = user_id);

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

grant execute on function public.betting_create_event_and_markets(text, uuid, numeric, jsonb) to authenticated;

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

grant execute on function public.betting_open_market(uuid) to authenticated;
grant execute on function public.betting_close_market(uuid) to authenticated;
grant execute on function public.betting_suspend_market(uuid) to authenticated;
