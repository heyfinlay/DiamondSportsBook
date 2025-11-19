-- Fix parimutuel baseline_odds NULL issue when placing first bet on an outcome
--
-- PROBLEM:
-- When placing the first bet on an outcome (p_outcome_pool = 0), the parimutuel_preview
-- function calculates: baseline_odds := (p_total_pool / nullif(p_outcome_pool, 0))
-- This results in NULL because dividing by NULL = NULL, which violates the NOT NULL
-- constraint on wagers.baseline_odds.
--
-- SOLUTION:
-- Handle the edge case where p_outcome_pool = 0 by using the same formula as when
-- p_total_pool = 0 (i.e., baseline_odds = 1 - p_takeout), which represents the
-- theoretical starting odds when no one has bet on this outcome yet.

CREATE OR REPLACE FUNCTION public.parimutuel_preview(
  p_total_pool numeric,
  p_outcome_pool numeric,
  p_stake numeric,
  p_takeout numeric
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  baseline_odds numeric;
  new_total numeric;
  new_outcome numeric;
  effective_odds numeric;
  price_impact numeric;
  implied_probability numeric;
  estimated_payout numeric;
BEGIN
  -- Handle edge cases for baseline odds calculation
  IF p_total_pool <= 0 OR p_outcome_pool <= 0 THEN
    -- When pool is empty or no one has bet on this outcome yet,
    -- baseline odds represent the theoretical starting odds
    baseline_odds := (1 - p_takeout);
  ELSE
    -- Normal parimutuel odds: (total_pool / outcome_pool) * (1 - takeout)
    baseline_odds := (p_total_pool / p_outcome_pool) * (1 - p_takeout);
  END IF;

  -- Calculate new totals after this bet
  new_total := p_total_pool + p_stake;
  new_outcome := p_outcome_pool + p_stake;

  -- Effective odds after this bet is added
  effective_odds := (new_total / new_outcome) * (1 - p_takeout);

  -- Price impact: how much this bet changes the odds
  price_impact := CASE
    WHEN baseline_odds = 0 THEN 0
    ELSE (effective_odds - baseline_odds) / baseline_odds
  END;

  -- Implied probability from effective odds
  implied_probability := CASE
    WHEN effective_odds = 0 THEN 0
    ELSE 1 / effective_odds
  END;

  -- Estimated payout if this outcome wins
  estimated_payout := p_stake * effective_odds;

  RETURN jsonb_build_object(
    'baseline_odds', baseline_odds,
    'effective_odds', effective_odds,
    'price_impact', price_impact,
    'implied_probability', implied_probability,
    'estimated_payout', estimated_payout
  );
END;
$$;

-- Add a helpful comment explaining that baseline_odds is for preview only
COMMENT ON COLUMN public.wagers.baseline_odds IS
  'Preview odds at time of bet placement. NOT used in settlement - actual payout uses parimutuel formula: (net_pool / total_on_winner) * stake';
