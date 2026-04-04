CREATE OR REPLACE FUNCTION public.sports_settle_event_markets(p_sports_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sports_event_row public.sports_events;
  container_row public.events;
  pool_row public.markets;
  winning_outcome_id uuid;
  candidate_count integer;
  settled_count integer := 0;
  voided_count integer := 0;
  home_score numeric := NULL;
  away_score numeric := NULL;
BEGIN
  IF NOT public.sports_can_manage_feeds() THEN
    RAISE EXCEPTION 'Requires feed management permission';
  END IF;

  SELECT * INTO sports_event_row
  FROM public.sports_events
  WHERE id = p_sports_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sports event not found';
  END IF;

  SELECT * INTO container_row
  FROM public.events
  WHERE sports_event_id = p_sports_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('event_id', NULL, 'settled', 0, 'voided', 0);
  END IF;

  IF sports_event_row.status = 'cancelled' THEN
    FOR pool_row IN
      SELECT *
      FROM public.markets
      WHERE event_id = container_row.id
        AND auto_managed = true
        AND status NOT IN ('settled', 'void')
    LOOP
      PERFORM public.sports_auto_void_pool(pool_row.id, 'event_cancelled');
      voided_count := voided_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
      'event_id', container_row.id,
      'settled', settled_count,
      'voided', voided_count
    );
  END IF;

  IF sports_event_row.status <> 'official'
     AND NOT EXISTS (
       SELECT 1
       FROM public.sports_event_results
       WHERE event_id = p_sports_event_id
         AND result_status = 'official'
     ) THEN
    RETURN jsonb_build_object(
      'event_id', container_row.id,
      'settled', 0,
      'voided', 0,
      'reason', 'official_result_not_available'
    );
  END IF;

  SELECT
    MAX(score) FILTER (WHERE side = 'home'),
    MAX(score) FILTER (WHERE side = 'away')
  INTO home_score, away_score
  FROM public.sports_event_participants
  WHERE event_id = p_sports_event_id;

  FOR pool_row IN
    SELECT *
    FROM public.markets
    WHERE event_id = container_row.id
      AND auto_managed = true
      AND status NOT IN ('settled', 'void')
    ORDER BY created_at
  LOOP
    winning_outcome_id := NULL;

    IF COALESCE((pool_row.result_derivation->>'include_draw')::boolean, false)
       AND home_score IS NOT NULL
       AND away_score IS NOT NULL
       AND home_score = away_score THEN
      SELECT id
      INTO winning_outcome_id
      FROM public.outcomes
      WHERE market_id = pool_row.id
        AND result_key = 'draw'
      LIMIT 1;
    ELSE
      SELECT COUNT(*)
      INTO candidate_count
      FROM public.outcomes o
      JOIN public.sports_event_results ser
        ON ser.participant_id = o.sports_participant_id
       AND ser.event_id = p_sports_event_id
      WHERE o.market_id = pool_row.id
        AND ser.result_status = 'official'
        AND ser.result_position = 1;

      IF candidate_count = 1 THEN
        SELECT o.id
        INTO winning_outcome_id
        FROM public.outcomes o
        JOIN public.sports_event_results ser
          ON ser.participant_id = o.sports_participant_id
         AND ser.event_id = p_sports_event_id
        WHERE o.market_id = pool_row.id
          AND ser.result_status = 'official'
          AND ser.result_position = 1
        LIMIT 1;
      END IF;
    END IF;

    IF winning_outcome_id IS NULL THEN
      CONTINUE;
    END IF;

    IF pool_row.status IN ('draft', 'open', 'suspended') THEN
      PERFORM public.sports_sync_pool_transition(pool_row.id, 'closed', 'awaiting_settlement');
    END IF;

    PERFORM public.sports_auto_settle_pool(
      pool_row.id,
      winning_outcome_id,
      jsonb_build_object(
        'sports_event_id', p_sports_event_id,
        'sports_event_status', sports_event_row.status
      )
    );
    settled_count := settled_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'event_id', container_row.id,
    'settled', settled_count,
    'voided', voided_count
  );
END;
$$;
