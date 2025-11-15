-- Phase 2 Wallet Policies & RPCs

-- Allow wallet owners and betting admins to view their deposits/withdrawals
create policy if not exists "Deposits readable" on public.deposits
  for select using (
    exists (
      select 1 from public.wallet_accounts wa
      where wa.id = deposits.account_id
        and (wa.user_id = auth.uid() or public.has_permission('betting_admin'))
    )
  );

create policy if not exists "Withdrawals readable" on public.withdrawals
  for select using (
    exists (
      select 1 from public.wallet_accounts wa
      where wa.id = withdrawals.account_id
        and (wa.user_id = auth.uid() or public.has_permission('betting_admin'))
    )
  );

-- Admins can view wallet accounts/transactions for oversight
create policy if not exists "Wallet accounts readable by admin" on public.wallet_accounts
  for select using (public.has_permission('betting_admin') or auth.uid() = user_id);

create policy if not exists "Wallet transactions readable by admin" on public.wallet_transactions
  for select using (
    public.has_permission('betting_admin')
    or exists (
      select 1 from public.wallet_accounts wa
      where wa.id = wallet_transactions.account_id
        and wa.user_id = auth.uid()
    )
  );

-- Wallet balances view convenience
grant select on public.wallet_balances to authenticated;

-- Approve deposit RPC
create or replace function public.wallet_approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  deposit_row public.deposits;
  account_row public.wallet_accounts;
begin
  if actor is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('betting_admin') then
    raise exception 'Requires admin permission';
  end if;

  select * into deposit_row from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;

  if deposit_row.status <> 'requested' then
    raise exception 'Deposit already processed';
  end if;

  select * into account_row from public.wallet_accounts where id = deposit_row.account_id;
  if account_row is null then
    raise exception 'Wallet account missing';
  end if;

  perform public.wallet_credit(
    account_row.user_id,
    deposit_row.amount,
    jsonb_build_object('reason', 'deposit_approved', 'deposit_id', p_deposit_id)
  );

  update public.deposits
  set status = 'approved',
      approved_at = now(),
      approved_by = actor
  where id = p_deposit_id;
end;
$$;

grant execute on function public.wallet_approve_deposit(uuid) to authenticated;
