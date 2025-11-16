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
