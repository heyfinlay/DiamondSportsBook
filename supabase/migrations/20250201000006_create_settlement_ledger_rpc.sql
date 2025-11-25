-- Expose a read-only settlement ledger for any pool/market

CREATE OR REPLACE FUNCTION public.settlement_get_pool_ledger(p_pool_id uuid)
RETURNS TABLE (
  wager_id uuid,
  user_id uuid,
  character_name text,
  username text,
  outcome_id uuid,
  outcome_label text,
  stake numeric,
  status text,
  effective_odds numeric,
  payout numeric,
  share_percent numeric,
  settled_at timestamptz,
  placed_at timestamptz,
  distribution_pool numeric,
  total_winning_stake numeric,
  payout_per_unit numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id AS wager_id,
    w.user_id,
    prof.display_name AS character_name,
    prof.username,
    w.outcome_id,
    o.label AS outcome_label,
    w.stake,
    w.status,
    w.effective_odds,
    COALESCE(sp.payout, 0) AS payout,
    CASE
      WHEN sp.id IS NOT NULL AND sp.total_winning_stake > 0
        THEN ROUND((sp.stake / sp.total_winning_stake) * 100, 4)
      ELSE 0
    END AS share_percent,
    COALESCE(sp.settled_at, w.created_at) AS settled_at,
    w.created_at AS placed_at,
    COALESCE(sp.distribution_pool, 0) AS distribution_pool,
    COALESCE(sp.total_winning_stake, 0) AS total_winning_stake,
    COALESCE(sp.payout_per_unit, 0) AS payout_per_unit
  FROM public.wagers w
  JOIN public.outcomes o ON o.id = w.outcome_id
  LEFT JOIN public.profiles prof ON prof.id = w.user_id
  LEFT JOIN public.settlement_payouts sp ON sp.wager_id = w.id
  WHERE w.market_id = p_pool_id
  ORDER BY w.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.settlement_get_pool_ledger(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settlement_get_pool_ledger(uuid) TO anon;
