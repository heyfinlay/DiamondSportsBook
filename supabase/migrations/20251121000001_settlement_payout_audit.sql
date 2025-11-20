-- ============================================================================
-- Settlement Payout Audit Trail
-- ============================================================================
-- This migration creates a comprehensive audit trail for all settlement payouts,
-- enabling admins to inspect exactly who was paid what and why.
--
-- Key Features:
-- - Records every payout with full context (pool size, rake, etc.)
-- - Links to wallet transactions for traceability
-- - Supports filtering by user, market, pool, or date
-- - RLS policies: users see their own, admins see all
-- ============================================================================

-- Create the settlement_payouts table
CREATE TABLE IF NOT EXISTS public.settlement_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  settlement_id uuid NOT NULL REFERENCES public.pending_settlements(id) ON DELETE CASCADE,
  wager_id uuid NOT NULL REFERENCES public.wagers(id) ON DELETE CASCADE,
  wallet_transaction_id uuid REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,

  -- IDs for efficient filtering
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_container_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  pool_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES public.outcomes(id) ON DELETE CASCADE,

  -- Amounts (the core payout data)
  stake numeric(14,2) NOT NULL,
  payout numeric(14,2) NOT NULL,

  -- Context snapshot at settlement time
  -- (denormalized for audit purposes - these values should never change)
  total_pool numeric(14,2) NOT NULL,
  rake_amount numeric(14,2) NOT NULL,
  distribution_pool numeric(14,2) NOT NULL,
  total_winning_stake numeric(14,2) NOT NULL,
  payout_per_unit numeric(14,6) NOT NULL,

  -- Audit metadata
  settled_at timestamptz NOT NULL DEFAULT now(),
  settled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS settlement_payouts_user_idx ON public.settlement_payouts(user_id);
CREATE INDEX IF NOT EXISTS settlement_payouts_pool_idx ON public.settlement_payouts(pool_id);
CREATE INDEX IF NOT EXISTS settlement_payouts_market_idx ON public.settlement_payouts(market_container_id);
CREATE INDEX IF NOT EXISTS settlement_payouts_wager_idx ON public.settlement_payouts(wager_id);
CREATE INDEX IF NOT EXISTS settlement_payouts_settlement_idx ON public.settlement_payouts(settlement_id);
CREATE INDEX IF NOT EXISTS settlement_payouts_settled_at_idx ON public.settlement_payouts(settled_at DESC);

-- Composite index for "recent payouts for a user"
CREATE INDEX IF NOT EXISTS settlement_payouts_user_settled_idx ON public.settlement_payouts(user_id, settled_at DESC);

-- Enable RLS
ALTER TABLE public.settlement_payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own payouts
DROP POLICY IF EXISTS "Users see own payouts" ON public.settlement_payouts;
CREATE POLICY "Users see own payouts" ON public.settlement_payouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can see all payouts
DROP POLICY IF EXISTS "Admins see all payouts" ON public.settlement_payouts;
CREATE POLICY "Admins see all payouts" ON public.settlement_payouts
  FOR SELECT
  USING (
    public.has_permission('sportsbook_admin')
    OR public.has_permission('betting_admin')
  );

-- Grant appropriate permissions
GRANT SELECT ON public.settlement_payouts TO authenticated;

-- ============================================================================
-- Update market_pool_confirm_settlement to populate audit trail
-- ============================================================================

CREATE OR REPLACE FUNCTION public.market_pool_confirm_settlement(p_pool_id uuid)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  pending_row public.pending_settlements;
  pool_row public.markets;
  preview jsonb;
  handle numeric := 0;
  rake_amount numeric := 0;
  distribution numeric := 0;
  payout_per_unit numeric := 0;
  payout numeric := 0;
  winning_total numeric := 0;
  wager_record record;
  wallet_tx_id uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  -- Get pending settlement
  SELECT * INTO pending_row
  FROM public.pending_settlements
  WHERE pool_id = p_pool_id AND status = 'proposed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending settlement for pool';
  END IF;

  -- Get pool and lock it
  SELECT * INTO pool_row FROM public.markets WHERE id = p_pool_id FOR UPDATE;

  -- ✅ IDEMPOTENCY CHECK #1: Prevent settling already-settled pools
  IF pool_row.status = 'settled' THEN
    RAISE EXCEPTION 'Pool already settled';
  END IF;

  -- ✅ IDEMPOTENCY CHECK #2: Check if wagers have already been settled
  PERFORM 1 FROM public.wagers
  WHERE market_id = p_pool_id
    AND status IN ('won', 'lost', 'void_refund')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Pool has already been settled (wagers marked won/lost)';
  END IF;

  -- Extract settlement parameters from preview
  preview := pending_row.summary;
  handle := coalesce((preview->>'handle')::numeric, 0);
  rake_amount := coalesce((preview->>'rake_amount')::numeric, 0);
  distribution := coalesce((preview->>'distribution_pool')::numeric, 0);
  payout_per_unit := coalesce((preview->>'payout_per_unit')::numeric, 0);

  -- Calculate total winning stake for audit trail
  SELECT coalesce(sum(stake), 0) INTO winning_total
  FROM public.wagers
  WHERE market_id = p_pool_id
    AND outcome_id = pending_row.winning_outcome_id
    AND status IN ('accepted', 'pending');

  -- Process all wagers
  FOR wager_record IN
    SELECT * FROM public.wagers
    WHERE market_id = p_pool_id AND status IN ('accepted', 'pending')
    FOR UPDATE
  LOOP
    IF wager_record.outcome_id = pending_row.winning_outcome_id THEN
      -- Winner: calculate payout
      payout := round(wager_record.stake * payout_per_unit, 2);

      IF payout > 0 THEN
        -- Credit wallet and capture transaction ID
        wallet_tx_id := (
          SELECT id FROM public.wallet_credit(
            wager_record.user_id,
            payout,
            jsonb_build_object(
              'market_id', wager_record.market_id,
              'pool_id', wager_record.market_id,
              'market_container_id', pool_row.event_id,
              'wager_id', wager_record.id,
              'type', 'pool_win'
            )
          )
        );

        -- ✅ NEW: Record payout in audit trail
        INSERT INTO public.settlement_payouts(
          settlement_id,
          wager_id,
          wallet_transaction_id,
          user_id,
          market_container_id,
          pool_id,
          outcome_id,
          stake,
          payout,
          total_pool,
          rake_amount,
          distribution_pool,
          total_winning_stake,
          payout_per_unit,
          settled_at,
          settled_by
        ) VALUES (
          pending_row.id,
          wager_record.id,
          wallet_tx_id,
          wager_record.user_id,
          pool_row.event_id,
          p_pool_id,
          wager_record.outcome_id,
          wager_record.stake,
          payout,
          handle,
          rake_amount,
          distribution,
          winning_total,
          payout_per_unit,
          now(),
          actor
        );
      END IF;

      -- Mark wager as won
      UPDATE public.wagers
      SET status = 'won', settled_payout = payout
      WHERE id = wager_record.id;
    ELSE
      -- Loser: mark as lost
      UPDATE public.wagers
      SET status = 'lost', settled_payout = 0
      WHERE id = wager_record.id;
    END IF;
  END LOOP;

  -- ✅ FIX: Add settled_at timestamp
  UPDATE public.markets
  SET
    status = 'settled',
    settled_at = now(),
    settlement_payload = preview
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  -- Mark pending settlement as settled
  UPDATE public.pending_settlements
  SET status = 'settled', approved_by = actor, approved_at = now()
  WHERE id = pending_row.id;

  -- Record rake in ledger
  IF rake_amount > 0 THEN
    INSERT INTO public.market_rake_ledger(market_id, pool_id, amount, meta)
    VALUES (
      pool_row.event_id,
      pool_row.id,
      rake_amount,
      jsonb_build_object('handle', handle, 'distribution_pool', distribution)
    );
  END IF;

  -- Refresh container status
  PERFORM public.market_refresh_container_status(pool_row.event_id);

  RETURN pool_row;
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.market_pool_confirm_settlement(uuid) TO authenticated;

-- ============================================================================
-- Helper function: Get payout details for a pool
-- ============================================================================

CREATE OR REPLACE FUNCTION public.settlement_get_pool_payouts(p_pool_id uuid)
RETURNS TABLE (
  payout_id uuid,
  wager_id uuid,
  user_id uuid,
  user_display_name text,
  outcome_label text,
  stake numeric,
  payout numeric,
  effective_odds numeric,
  share_percent numeric,
  wallet_tx_id uuid,
  settled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.wager_id,
    sp.user_id,
    p.display_name,
    o.label,
    sp.stake,
    sp.payout,
    CASE WHEN sp.stake > 0 THEN round(sp.payout / sp.stake, 2) ELSE 0 END AS effective_odds,
    CASE WHEN sp.total_winning_stake > 0
         THEN round((sp.stake / sp.total_winning_stake) * 100, 2)
         ELSE 0
    END AS share_percent,
    sp.wallet_transaction_id,
    sp.settled_at
  FROM public.settlement_payouts sp
  LEFT JOIN public.profiles p ON p.id = sp.user_id
  LEFT JOIN public.outcomes o ON o.id = sp.outcome_id
  WHERE sp.pool_id = p_pool_id
  ORDER BY sp.payout DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settlement_get_pool_payouts(uuid) TO authenticated;

-- ============================================================================
-- Helper function: Get payout history for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.settlement_get_user_payouts(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  payout_id uuid,
  wager_id uuid,
  event_title text,
  pool_name text,
  outcome_label text,
  stake numeric,
  payout numeric,
  effective_odds numeric,
  settled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- If no user_id provided, use current user
  target_user_id := coalesce(p_user_id, auth.uid());

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Permission check: users can see their own, admins can see anyone's
  IF target_user_id <> auth.uid() THEN
    IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.wager_id,
    e.title,
    m.name,
    o.label,
    sp.stake,
    sp.payout,
    CASE WHEN sp.stake > 0 THEN round(sp.payout / sp.stake, 2) ELSE 0 END,
    sp.settled_at
  FROM public.settlement_payouts sp
  LEFT JOIN public.events e ON e.id = sp.market_container_id
  LEFT JOIN public.markets m ON m.id = sp.pool_id
  LEFT JOIN public.outcomes o ON o.id = sp.outcome_id
  WHERE sp.user_id = target_user_id
  ORDER BY sp.settled_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settlement_get_user_payouts(uuid, integer) TO authenticated;

-- ============================================================================
-- Comment on table
-- ============================================================================

COMMENT ON TABLE public.settlement_payouts IS
'Audit trail of all settlement payouts. Records every winning payout with full context including pool size, rake, and proportional share. Enables compliance reporting and payout verification.';

COMMENT ON COLUMN public.settlement_payouts.payout_per_unit IS
'The multiplier used to calculate payouts: (distribution_pool / total_winning_stake). Each winner gets (stake * payout_per_unit).';

COMMENT ON COLUMN public.settlement_payouts.total_winning_stake IS
'Sum of all stakes on the winning outcome at settlement time. Used to calculate each winner''s proportional share.';
