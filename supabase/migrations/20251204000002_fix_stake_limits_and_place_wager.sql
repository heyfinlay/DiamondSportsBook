-- ============================================================================
-- Normalize stake limits on open pools and harden betting_place_wager
-- ============================================================================

-- Ensure all open pools have sensible stake defaults
UPDATE public.markets
SET
  min_stake = GREATEST(COALESCE(NULLIF(min_stake, 0), 1), 1),
  max_stake = CASE
    WHEN max_stake IS NULL OR max_stake < 1 THEN 1000000
    ELSE max_stake
  END
WHERE status = 'open'
  AND archived IS NOT TRUE;

-- Harden stake validation + error context
CREATE OR REPLACE FUNCTION public.betting_place_wager(
  p_market_id uuid,
  p_outcome_id uuid,
  p_stake numeric,
  p_idempotency_key text DEFAULT NULL
) RETURNS public.wagers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  wager_row public.wagers;
  pool_row public.markets;
  container_row public.events;
  outcome_row public.outcomes;
  normalized_min numeric;
  normalized_max numeric;
  rake numeric;
  preview jsonb;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO pool_row FROM public.markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found for id %', p_market_id;
  END IF;

  SELECT * INTO container_row FROM public.events WHERE id = pool_row.event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found for pool %', pool_row.id;
  END IF;

  IF pool_row.status <> 'open' THEN
    RAISE EXCEPTION 'Pool "%" is not open (status=%)', pool_row.name, pool_row.status;
  END IF;

  IF now() > COALESCE(pool_row.close_time, now() + interval '100 years') THEN
    RAISE EXCEPTION 'Pool "%" is closed for wagering (closed at %)', pool_row.name, pool_row.close_time;
  END IF;

  normalized_min := COALESCE(NULLIF(pool_row.min_stake, 0), 1);
  IF normalized_min < 0 THEN
    normalized_min := 1;
  END IF;

  normalized_max := NULLIF(pool_row.max_stake, 0); -- NULL => no upper bound

  IF p_stake < normalized_min THEN
    RAISE EXCEPTION USING
      errcode = 'P0001',
      message = format(
        'Stake Ɖ%s is below the minimum Ɖ%s allowed for pool "%" (%s)',
        p_stake,
        normalized_min,
        pool_row.name,
        pool_row.id
      );
  END IF;

  IF normalized_max IS NOT NULL AND p_stake > normalized_max THEN
    RAISE EXCEPTION USING
      errcode = 'P0001',
      message = format(
        'Stake Ɖ%s exceeds the maximum Ɖ%s allowed for pool "%" (%s)',
        p_stake,
        normalized_max,
        pool_row.name,
        pool_row.id
      );
  END IF;

  SELECT * INTO outcome_row
  FROM public.outcomes
  WHERE id = p_outcome_id
    AND market_id = p_market_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outcome not found';
  END IF;

  rake := COALESCE(pool_row.rake_percent, container_row.takeout);

  PERFORM *
  FROM public.wagers
  WHERE user_id = actor
    AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN (
      SELECT *
      FROM public.wagers
      WHERE user_id = actor
        AND idempotency_key = p_idempotency_key
    );
  END IF;

  preview := public.parimutuel_preview(
    pool_row.total_pool,
    outcome_row.pool,
    p_stake,
    rake
  ) || jsonb_build_object(
    'market_id', pool_row.id,
    'outcome_id', outcome_row.id,
    'market_name', pool_row.name,
    'outcome_label', outcome_row.label,
    'market_status', pool_row.status,
    'takeout', rake
  );

  PERFORM public.wallet_debit(
    actor,
    p_stake,
    jsonb_build_object(
      'market_id', p_market_id,
      'pool_id', p_market_id,
      'market_container_id', container_row.id,
      'outcome_id', p_outcome_id
    )
  );

  UPDATE public.markets
  SET total_pool = total_pool + p_stake
  WHERE id = p_market_id;

  UPDATE public.outcomes
  SET pool = pool + p_stake
  WHERE id = p_outcome_id;

  INSERT INTO public.wagers(
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
  ) VALUES (
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
  RETURNING * INTO wager_row;

  RETURN wager_row;
END;
$$;
