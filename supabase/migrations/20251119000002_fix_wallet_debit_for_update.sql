-- ============================================================================
-- Fix wallet_debit FOR UPDATE + GROUP BY Error
-- ============================================================================
--
-- The error "FOR UPDATE is not allowed with GROUP BY clause" occurs in
-- wallet_debit() when it tries to lock the wallet_balances view, which
-- uses GROUP BY to aggregate transactions.
--
-- Solution: Lock the base table (wallet_accounts) instead of the view,
-- then compute the balance separately without FOR UPDATE.
--
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_user_id uuid,
  p_amount numeric,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_id_val uuid;
  current_balance numeric;
  tx public.wallet_transactions;
BEGIN
  -- Validate input
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- STEP 1: Lock the wallet_accounts row (base table, no GROUP BY)
  SELECT id INTO account_id_val
  FROM public.wallet_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF account_id_val IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- STEP 2: Calculate balance separately without FOR UPDATE
  -- This query uses GROUP BY but we don't lock it
  SELECT COALESCE(SUM(amount), 0)
  INTO current_balance
  FROM public.wallet_transactions
  WHERE account_id = account_id_val;

  -- Validate sufficient funds
  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds (balance: %, required: %)', current_balance, p_amount;
  END IF;

  -- Insert debit transaction
  INSERT INTO public.wallet_transactions(account_id, amount, kind, meta)
  VALUES (account_id_val, -p_amount, 'debit', p_meta)
  RETURNING * INTO tx;

  RETURN tx;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.wallet_debit(uuid, numeric, jsonb) TO authenticated;

-- ============================================================================
-- Also fix wallet_request_withdrawal which has the same issue
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wallet_request_withdrawal(p_amount numeric)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  account_id_val uuid;
  current_balance numeric;
  withdrawal_row public.withdrawals;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- STEP 1: Lock the wallet_accounts row (base table)
  SELECT id INTO account_id_val
  FROM public.wallet_accounts
  WHERE user_id = actor
  FOR UPDATE;

  IF account_id_val IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- STEP 2: Calculate balance separately without FOR UPDATE
  SELECT COALESCE(SUM(amount), 0)
  INTO current_balance
  FROM public.wallet_transactions
  WHERE account_id = account_id_val;

  -- Validate sufficient funds
  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds (balance: %, required: %)', current_balance, p_amount;
  END IF;

  -- Lock funds immediately
  PERFORM public.wallet_debit(actor, p_amount, jsonb_build_object('reason', 'withdrawal_hold'));

  -- Create withdrawal request
  INSERT INTO public.withdrawals(account_id, amount)
  VALUES (account_id_val, p_amount)
  RETURNING * INTO withdrawal_row;

  RETURN withdrawal_row;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.wallet_request_withdrawal(numeric) TO authenticated;

-- ============================================================================
-- Migration complete!
-- ============================================================================
