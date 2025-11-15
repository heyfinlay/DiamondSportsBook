-- Betting Domain Schema

create type public.market_status as enum ('draft', 'open', 'suspended', 'closed', 'settled');
create type public.wager_status as enum ('pending', 'accepted', 'void', 'won', 'lost', 'refunded');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id),
  title text not null,
  starts_at timestamptz,
  takeout numeric(5,4) not null default 0.12,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  status public.market_status not null default 'draft',
  total_pool numeric(14,2) not null default 0,
  min_stake numeric(14,2) not null default 10,
  max_stake numeric(14,2) not null default 10000,
  close_time timestamptz,
  created_at timestamptz not null default now()
);

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  label text not null,
  driver_id uuid references public.drivers(id),
  house_edge numeric(5,4) not null default 0,
  pool numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create unique index outcomes_market_label_idx on public.outcomes(market_id, label);

create table public.market_wallets (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id uuid references public.outcomes(id),
  balance numeric(14,2) not null default 0,
  constraint market_wallet_unique unique (market_id, outcome_id)
);

create table public.wagers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id uuid not null references public.outcomes(id),
  stake numeric(14,2) not null,
  status public.wager_status not null default 'pending',
  baseline_odds numeric(10,4) not null,
  effective_odds numeric(10,4) not null,
  price_impact numeric(10,6),
  estimated_payout numeric(14,2),
  settled_payout numeric(14,2),
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index wagers_idempotency_idx on public.wagers(user_id, idempotency_key) where idempotency_key is not null;

create table public.pending_settlements (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  winning_outcome_id uuid not null references public.outcomes(id),
  proposed_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  proposed_at timestamptz not null default now(),
  approved_at timestamptz,
  status text not null default 'proposed',
  summary jsonb not null default '{}'::jsonb
);

create table public.quote_telemetry (
  id bigserial primary key,
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id uuid not null references public.outcomes(id),
  stake numeric(14,2) not null,
  baseline_odds numeric(10,4) not null,
  effective_odds numeric(10,4) not null,
  price_impact numeric(10,6) not null,
  computed_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.markets enable row level security;
alter table public.wagers enable row level security;
alter table public.outcomes enable row level security;

create policy "Markets readable to all" on public.markets for select using (true);
create policy "Outcomes readable to all" on public.outcomes for select using (true);
create policy "Wagers read own" on public.wagers for select using (auth.uid() = user_id);

-- Helpers
create or replace function public.parimutuel_preview(
  p_total_pool numeric,
  p_outcome_pool numeric,
  p_stake numeric,
  p_takeout numeric
) returns jsonb
language plpgsql
as $$
declare
  baseline_odds numeric;
  new_total numeric;
  new_outcome numeric;
  effective_odds numeric;
  price_impact numeric;
  implied_probability numeric;
  estimated_payout numeric;
begin
  if p_total_pool <= 0 then
    baseline_odds := (1 - p_takeout);
  else
    baseline_odds := (p_total_pool / nullif(p_outcome_pool, 0)) * (1 - p_takeout);
  end if;

  new_total := p_total_pool + p_stake;
  new_outcome := p_outcome_pool + p_stake;
  effective_odds := (new_total / nullif(new_outcome, 0)) * (1 - p_takeout);
  price_impact := case when baseline_odds = 0 then 0 else (effective_odds - baseline_odds) / baseline_odds end;
  implied_probability := 1 / nullif(effective_odds, 0);
  estimated_payout := p_stake * effective_odds;

  return jsonb_build_object(
    'baseline_odds', baseline_odds,
    'effective_odds', effective_odds,
    'price_impact', price_impact,
    'implied_probability', implied_probability,
    'estimated_payout', estimated_payout
  );
end;
$$;

create or replace function public.betting_preview_wager(
  p_market_id uuid,
  p_outcome_id uuid,
  p_stake numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  market_row public.markets;
  outcome_row public.outcomes;
begin
  select * into market_row from public.markets where id = p_market_id;
  if not found then
    raise exception 'Market not found';
  end if;

  if market_row.status <> 'open' then
    raise exception 'Market is not open';
  end if;

  if now() > coalesce(market_row.close_time, now() + interval '100 years') then
    raise exception 'Market closed';
  end if;

  if p_stake < market_row.min_stake or p_stake > market_row.max_stake then
    raise exception 'Stake outside limits';
  end if;

  select * into outcome_row from public.outcomes where id = p_outcome_id and market_id = p_market_id;
  if not found then
    raise exception 'Outcome not found';
  end if;

  return public.parimutuel_preview(
    market_row.total_pool,
    outcome_row.pool,
    p_stake,
    (select takeout from public.events where id = market_row.event_id)
  );
end;
$$;

grant execute on function public.betting_preview_wager(uuid, uuid, numeric) to authenticated;

create or replace function public.betting_place_wager(
  p_market_id uuid,
  p_outcome_id uuid,
  p_stake numeric,
  p_idempotency_key text default null
) returns public.wagers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  preview jsonb;
  wager_row public.wagers;
  market_row public.markets;
  outcome_row public.outcomes;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  preview := public.betting_preview_wager(p_market_id, p_outcome_id, p_stake);

  perform * from public.wagers where user_id = actor and idempotency_key = p_idempotency_key;
  if found then
    return (select * from public.wagers where user_id = actor and idempotency_key = p_idempotency_key);
  end if;

  perform public.wallet_debit(actor, p_stake, jsonb_build_object('market_id', p_market_id, 'outcome_id', p_outcome_id));

  update public.markets set total_pool = total_pool + p_stake where id = p_market_id returning * into market_row;
  update public.outcomes set pool = pool + p_stake where id = p_outcome_id returning * into outcome_row;

  insert into public.wagers(
    user_id,
    market_id,
    outcome_id,
    stake,
    status,
    baseline_odds,
    effective_odds,
    price_impact,
    estimated_payout,
    idempotency_key
  )
  values (
    actor,
    p_market_id,
    p_outcome_id,
    p_stake,
    'accepted',
    (preview->>'baseline_odds')::numeric,
    (preview->>'effective_odds')::numeric,
    (preview->>'price_impact')::numeric,
    (preview->>'estimated_payout')::numeric,
    p_idempotency_key
  )
  returning * into wager_row;

  return wager_row;
end;
$$;

grant execute on function public.betting_place_wager(uuid, uuid, numeric, text) to authenticated;

create or replace function public.betting_settle_market(
  p_market_id uuid,
  p_winning_outcome uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  market_row public.markets;
  total_pool numeric;
  takeout numeric;
  total_outcome_pool numeric;
  each_wager record;
  payout numeric;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('betting_admin') then
    raise exception 'Requires betting admin permission';
  end if;

  select * into market_row from public.markets where id = p_market_id for update;
  if market_row.status <> 'closed' then
    raise exception 'Market must be closed before settlement';
  end if;

  select total_pool into total_pool from public.markets where id = p_market_id;
  select takeout into takeout from public.events where id = market_row.event_id;
  select pool into total_outcome_pool from public.outcomes where id = p_winning_outcome;

  for each_wager in
    select * from public.wagers where market_id = p_market_id and status = 'accepted'
  loop
    if each_wager.outcome_id = p_winning_outcome then
      payout := each_wager.stake * (total_pool / nullif(total_outcome_pool, 0)) * (1 - takeout);
      perform public.wallet_credit(each_wager.user_id, payout, jsonb_build_object('market_id', p_market_id, 'wager_id', each_wager.id));
      update public.wagers set status = 'won', settled_payout = payout where id = each_wager.id;
    else
      update public.wagers set status = 'lost', settled_payout = 0 where id = each_wager.id;
    end if;
  end loop;

  update public.markets set status = 'settled' where id = p_market_id;
end;
$$;

grant execute on function public.betting_settle_market(uuid, uuid) to authenticated;
