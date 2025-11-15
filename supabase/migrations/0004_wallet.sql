-- Wallet Domain

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  created_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.wallet_accounts(id) on delete cascade,
  amount numeric(14,2) not null,
  kind text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.wallet_accounts(id) on delete cascade,
  amount numeric(14,2) not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.wallet_accounts(id) on delete cascade,
  amount numeric(14,2) not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id)
);

create or replace view public.wallet_balances as
select
  wa.id as account_id,
  wa.user_id,
  coalesce(sum(wt.amount), 0)::numeric(14,2) as balance
from public.wallet_accounts wa
left join public.wallet_transactions wt on wt.account_id = wa.id
group by wa.id;

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;

create policy "Wallet account per user" on public.wallet_accounts
  for select
  using (auth.uid() = user_id);

create policy "Wallet transactions own" on public.wallet_transactions
  for select
  using (
    exists (
      select 1 from public.wallet_accounts wa
      where wa.id = wallet_transactions.account_id
        and wa.user_id = auth.uid()
    )
  );

create or replace function public.wallet_credit(
  p_user_id uuid,
  p_amount numeric,
  p_meta jsonb default '{}'::jsonb
) returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid;
  tx public.wallet_transactions;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id into account_id from public.wallet_accounts where user_id = p_user_id;
  if account_id is null then
    insert into public.wallet_accounts(user_id) values (p_user_id) returning id into account_id;
  end if;

  insert into public.wallet_transactions(account_id, amount, kind, meta)
  values (account_id, p_amount, 'credit', p_meta)
  returning * into tx;

  return tx;
end;
$$;

create or replace function public.wallet_debit(
  p_user_id uuid,
  p_amount numeric,
  p_meta jsonb default '{}'::jsonb
) returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  account record;
  tx public.wallet_transactions;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into account from public.wallet_balances where user_id = p_user_id for update;
  if account is null then
    raise exception 'Wallet not found';
  end if;

  if account.balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  insert into public.wallet_transactions(account_id, amount, kind, meta)
  values (account.account_id, -p_amount, 'debit', p_meta)
  returning * into tx;

  return tx;
end;
$$;

create or replace function public.wallet_request_deposit(p_amount numeric)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  account uuid;
  deposit_row public.deposits;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id into account from public.wallet_accounts where user_id = actor;
  if account is null then
    insert into public.wallet_accounts(user_id) values (actor) returning id into account;
  end if;

  insert into public.deposits(account_id, amount)
  values (account, p_amount)
  returning * into deposit_row;

  return deposit_row;
end;
$$;

create or replace function public.wallet_request_withdrawal(p_amount numeric)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  account record;
  withdrawal_row public.withdrawals;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into account from public.wallet_balances where user_id = actor for update;
  if account.balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  -- lock funds immediately
  perform public.wallet_debit(actor, p_amount, jsonb_build_object('reason', 'withdrawal_hold'));

  insert into public.withdrawals(account_id, amount)
  values (account.account_id, p_amount)
  returning * into withdrawal_row;

  return withdrawal_row;
end;
$$;

create or replace function public.wallet_approve_withdrawal(p_withdrawal_id uuid)
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

  if not public.has_permission('betting_admin') then
    raise exception 'Requires admin permission';
  end if;

  update public.withdrawals
  set status = 'approved',
      processed_at = now(),
      processed_by = actor
  where id = p_withdrawal_id
    and status = 'requested';
end;
$$;

create or replace function public.wallet_reject_withdrawal(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  withdrawal_row public.withdrawals;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('betting_admin') then
    raise exception 'Requires admin permission';
  end if;

  select * into withdrawal_row from public.withdrawals where id = p_withdrawal_id for update;
  if withdrawal_row.status <> 'requested' then
    raise exception 'Withdrawal already processed';
  end if;

  perform public.wallet_credit(
    (select user_id from public.wallet_accounts where id = withdrawal_row.account_id),
    withdrawal_row.amount,
    jsonb_build_object('reason', 'withdrawal_rejected')
  );

  update public.withdrawals
  set status = 'rejected',
      processed_at = now(),
      processed_by = actor
  where id = p_withdrawal_id;
end;
$$;

grant execute on function public.wallet_credit(uuid, numeric, jsonb) to authenticated;
grant execute on function public.wallet_debit(uuid, numeric, jsonb) to authenticated;
grant execute on function public.wallet_request_deposit(numeric) to authenticated;
grant execute on function public.wallet_request_withdrawal(numeric) to authenticated;
grant execute on function public.wallet_approve_withdrawal(uuid) to authenticated;
grant execute on function public.wallet_reject_withdrawal(uuid) to authenticated;
