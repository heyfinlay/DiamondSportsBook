-- ============================================================================
-- SPORTS SYNC AUTOMATION
-- Internal helpers for server-side Sportradar ingestion, market generation,
-- lifecycle transitions, and automated single-winner settlement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sports_is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.sports_can_manage_feeds()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.sports_is_service_role() THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN
    public.has_permission('sportsbook_admin')
    OR public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin');
END;
$$;

COMMENT ON FUNCTION public.sports_can_manage_feeds()
IS 'Returns true for authenticated sportsbook operators and service-role automation jobs.';

ALTER TABLE public.pending_settlements
  ALTER COLUMN proposed_by DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS events_sports_event_unique_idx
  ON public.events(sports_event_id)
  WHERE sports_event_id IS NOT NULL;

UPDATE public.sports_providers
SET
  quota_limit = COALESCE(quota_limit, 1000),
  quota_window = COALESCE(quota_window, '30 days'),
  config = jsonb_strip_nulls(
    COALESCE(config, '{}'::jsonb) || jsonb_build_object(
      'access_level', COALESCE(config->>'access_level', 'trial'),
      'language_code', COALESCE(config->>'language_code', 'en'),
      'request_budget', COALESCE(
        config->'request_budget',
        jsonb_build_object(
          'soft_monthly_limit', 900,
          'per_run_request_cap', 24,
          'live_detail_cap', 4,
          'schedule_days_ahead', 5,
          'schedule_days_back', 1
        )
      ),
      'sports', COALESCE(
        config->'sports',
        jsonb_build_object(
          'f1', jsonb_build_object(
            'enabled', true,
            'package', 'formula-1',
            'allowed_competition_names', jsonb_build_array('Formula 1'),
            'schedule_days_ahead', 14,
            'schedule_days_back', 2,
            'live_detail_cap', 2
          ),
          'nrl', jsonb_build_object(
            'enabled', true,
            'package', 'league',
            'allowed_competition_names', jsonb_build_array('NRL', 'National Rugby League'),
            'schedule_days_ahead', 7,
            'schedule_days_back', 1
          ),
          'afl', jsonb_build_object(
            'enabled', true,
            'allowed_competition_names', jsonb_build_array('AFL', 'Australian Football League'),
            'schedule_days_ahead', 7,
            'schedule_days_back', 1
          ),
          'mma', jsonb_build_object(
            'enabled', true,
            'allowed_competition_names', jsonb_build_array('UFC', 'Ultimate Fighting Championship'),
            'schedule_days_ahead', 14,
            'schedule_days_back', 3
          ),
          'soccer', jsonb_build_object(
            'enabled', false,
            'allowed_competition_names', '[]'::jsonb,
            'schedule_days_ahead', 4,
            'schedule_days_back', 1
          )
        )
      )
    )
  )
WHERE provider_key = 'sportradar';

UPDATE public.sports_market_templates
SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('include_draw', true)
WHERE market_key IN ('nrl_match_winner', 'afl_match_winner', 'soccer_match_winner');

UPDATE public.sports_market_templates
SET
  enabled = false,
  config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'requires_multi_winner', true,
    'disabled_reason', 'Current settlement engine supports a single winning outcome only.'
  )
WHERE market_key = 'f1_podium_finish';

CREATE OR REPLACE FUNCTION public.sports_upsert_event_container(p_sports_event_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sports_event_row public.sports_events;
  competition_row public.sports_competitions;
  event_row public.events;
  description_text text;
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

  SELECT * INTO competition_row
  FROM public.sports_competitions
  WHERE id = sports_event_row.competition_id;

  description_text := COALESCE(
    NULLIF(trim(concat_ws(' • ', competition_row.name, sports_event_row.round_label, sports_event_row.venue_name)), ''),
    sports_event_row.event_type
  );

  SELECT * INTO event_row
  FROM public.events
  WHERE sports_event_id = p_sports_event_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.events
    SET
      title = sports_event_row.title,
      description = description_text,
      starts_at = sports_event_row.scheduled_start,
      competition_id = sports_event_row.competition_id,
      auto_created = true,
      external_status = sports_event_row.status::text,
      metadata = COALESCE(event_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'provider_event_id', sports_event_row.provider_event_id,
        'provider_id', sports_event_row.provider_id,
        'round_label', sports_event_row.round_label,
        'event_type', sports_event_row.event_type
      )
    WHERE id = event_row.id
    RETURNING * INTO event_row;
  ELSE
    INSERT INTO public.events(
      title,
      description,
      starts_at,
      takeout,
      status,
      metadata,
      source_type,
      sport_code,
      competition_id,
      sports_event_id,
      auto_created,
      external_status
    )
    VALUES (
      sports_event_row.title,
      description_text,
      sports_event_row.scheduled_start,
      0.12,
      'draft',
      jsonb_build_object(
        'provider_event_id', sports_event_row.provider_event_id,
        'provider_id', sports_event_row.provider_id,
        'round_label', sports_event_row.round_label,
        'event_type', sports_event_row.event_type
      ),
      'external_feed',
      sports_event_row.sport_code,
      sports_event_row.competition_id,
      sports_event_row.id,
      true,
      sports_event_row.status::text
    )
    RETURNING * INTO event_row;
  END IF;

  RETURN event_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_sync_pool_transition(
  p_pool_id uuid,
  p_status public.market_status,
  p_reason text DEFAULT NULL
)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_row public.markets;
BEGIN
  UPDATE public.markets
  SET
    status = p_status,
    trading_status_reason = p_reason,
    settled_at = CASE WHEN p_status = 'settled' THEN COALESCE(settled_at, now()) ELSE settled_at END
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  PERFORM public.market_refresh_container_status(pool_row.event_id);
  RETURN pool_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_auto_void_pool(
  p_pool_id uuid,
  p_reason text DEFAULT 'external_feed_void'
)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_row public.markets;
  wager_record record;
BEGIN
  SELECT * INTO pool_row
  FROM public.markets
  WHERE id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  IF pool_row.status IN ('void', 'settled') THEN
    RETURN pool_row;
  END IF;

  FOR wager_record IN
    SELECT * FROM public.wagers
    WHERE market_id = p_pool_id
      AND status IN ('accepted', 'pending')
    FOR UPDATE
  LOOP
    PERFORM public.wallet_credit(
      wager_record.user_id,
      wager_record.stake,
      jsonb_build_object(
        'market_id', wager_record.market_id,
        'pool_id', wager_record.market_id,
        'market_container_id', pool_row.event_id,
        'wager_id', wager_record.id,
        'type', 'pool_void',
        'reason', p_reason,
        'source', 'sports_feed'
      )
    );

    UPDATE public.wagers
    SET status = 'void_refund',
        settled_payout = wager_record.stake
    WHERE id = wager_record.id;
  END LOOP;

  DELETE FROM public.pending_settlements WHERE pool_id = p_pool_id;

  UPDATE public.outcomes
  SET pool = 0
  WHERE market_id = p_pool_id;

  UPDATE public.markets
  SET
    status = 'void',
    total_pool = 0,
    trading_status_reason = p_reason,
    settled_at = now(),
    settlement_payload = jsonb_build_object(
      'reason', p_reason,
      'source', 'sports_feed'
    )
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  PERFORM public.market_refresh_container_status(pool_row.event_id);
  RETURN pool_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_auto_settle_pool(
  p_pool_id uuid,
  p_winning_outcome_id uuid,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_row public.markets;
  outcome_row public.outcomes;
  pending_row public.pending_settlements;
  handle numeric := 0;
  winning_total numeric := 0;
  rake_amount numeric := 0;
  distribution numeric := 0;
  payout_per_unit numeric := 0;
  payout numeric := 0;
  preview jsonb;
  wager_record record;
  wallet_tx_id uuid;
BEGIN
  SELECT * INTO pool_row
  FROM public.markets
  WHERE id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  IF pool_row.status = 'settled' THEN
    RETURN pool_row;
  END IF;

  IF pool_row.status = 'void' THEN
    RETURN pool_row;
  END IF;

  SELECT * INTO outcome_row
  FROM public.outcomes
  WHERE id = p_winning_outcome_id
    AND market_id = p_pool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winning outcome not found for pool';
  END IF;

  SELECT COALESCE(sum(stake), 0) INTO handle
  FROM public.wagers
  WHERE market_id = p_pool_id
    AND status IN ('accepted', 'pending');

  SELECT COALESCE(sum(stake), 0) INTO winning_total
  FROM public.wagers
  WHERE market_id = p_pool_id
    AND outcome_id = p_winning_outcome_id
    AND status IN ('accepted', 'pending');

  rake_amount := round(handle * COALESCE(pool_row.rake_percent, 0), 2);
  distribution := handle - rake_amount;
  payout_per_unit := CASE
    WHEN winning_total > 0 THEN distribution / winning_total
    ELSE 0
  END;

  preview := jsonb_build_object(
    'pool_id', p_pool_id,
    'market_id', pool_row.event_id,
    'outcome_id', p_winning_outcome_id,
    'outcome_label', outcome_row.label,
    'handle', handle,
    'rake_percent', COALESCE(pool_row.rake_percent, 0),
    'rake_amount', rake_amount,
    'distribution_pool', distribution,
    'payout_per_unit', payout_per_unit,
    'source', 'sports_feed'
  ) || COALESCE(p_meta, '{}'::jsonb);

  INSERT INTO public.pending_settlements(
    pool_id,
    market_container_id,
    winning_outcome_id,
    proposed_by,
    approved_by,
    status,
    summary,
    handle,
    rake_amount,
    distribution_pool,
    payout_per_unit,
    approved_at
  )
  VALUES (
    p_pool_id,
    pool_row.event_id,
    p_winning_outcome_id,
    auth.uid(),
    NULL,
    'settled',
    preview,
    handle,
    rake_amount,
    distribution,
    payout_per_unit,
    now()
  )
  ON CONFLICT (pool_id)
  DO UPDATE SET
    winning_outcome_id = EXCLUDED.winning_outcome_id,
    status = 'settled',
    summary = EXCLUDED.summary,
    handle = EXCLUDED.handle,
    rake_amount = EXCLUDED.rake_amount,
    distribution_pool = EXCLUDED.distribution_pool,
    payout_per_unit = EXCLUDED.payout_per_unit,
    approved_at = now()
  RETURNING * INTO pending_row;

  FOR wager_record IN
    SELECT * FROM public.wagers
    WHERE market_id = p_pool_id
      AND status IN ('accepted', 'pending')
    FOR UPDATE
  LOOP
    IF wager_record.outcome_id = p_winning_outcome_id THEN
      payout := round(wager_record.stake * payout_per_unit, 2);

      IF payout > 0 THEN
        wallet_tx_id := (
          SELECT id FROM public.wallet_credit(
            wager_record.user_id,
            payout,
            jsonb_build_object(
              'market_id', wager_record.market_id,
              'pool_id', wager_record.market_id,
              'market_container_id', pool_row.event_id,
              'wager_id', wager_record.id,
              'type', 'pool_win',
              'source', 'sports_feed'
            )
          )
        );

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
          settled_by,
          meta
        )
        VALUES (
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
          auth.uid(),
          jsonb_build_object('source', 'sports_feed')
        )
        ON CONFLICT DO NOTHING;
      END IF;

      UPDATE public.wagers
      SET status = 'won',
          settled_payout = payout
      WHERE id = wager_record.id;
    ELSE
      UPDATE public.wagers
      SET status = 'lost',
          settled_payout = 0
      WHERE id = wager_record.id;
    END IF;
  END LOOP;

  UPDATE public.markets
  SET
    status = 'settled',
    trading_status_reason = NULL,
    settled_at = now(),
    settlement_payload = preview
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  IF rake_amount > 0 THEN
    INSERT INTO public.market_rake_ledger(market_id, pool_id, amount, meta)
    VALUES (
      pool_row.event_id,
      pool_row.id,
      rake_amount,
      jsonb_build_object(
        'handle', handle,
        'distribution_pool', distribution,
        'source', 'sports_feed'
      )
    );
  END IF;

  PERFORM public.market_refresh_container_status(pool_row.event_id);
  RETURN pool_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_generate_markets_for_event(p_sports_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sports_event_row public.sports_events;
  container_row public.events;
  template_row public.sports_market_templates;
  generation_row public.sports_market_generation_runs;
  market_row public.markets;
  participant_record record;
  outcome_row public.outcomes;
  supported boolean;
  generated_count integer := 0;
  updated_count integer := 0;
  skipped_count integer := 0;
  close_time_value timestamptz;
  open_at_value timestamptz;
  template_config jsonb;
  draw_outcome public.outcomes;
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

  container_row := public.sports_upsert_event_container(p_sports_event_id);

  FOR template_row IN
    SELECT *
    FROM public.sports_market_templates
    WHERE sport_code = sports_event_row.sport_code
      AND event_type = sports_event_row.event_type
    ORDER BY display_name
  LOOP
    template_config := COALESCE(template_row.config, '{}'::jsonb);
    supported := template_row.enabled
      AND COALESCE((template_config->>'requires_multi_winner')::boolean, false) = false
      AND COALESCE(template_config->>'pool_type', 'winner') IN ('winner', 'moneyline');

    IF NOT supported THEN
      skipped_count := skipped_count + 1;
      INSERT INTO public.sports_market_generation_runs(
        sports_event_id,
        template_id,
        event_id,
        status,
        detail
      )
      VALUES (
        p_sports_event_id,
        template_row.id,
        container_row.id,
        'skipped',
        jsonb_build_object(
          'reason',
          COALESCE(template_config->>'disabled_reason', 'Unsupported template for single-winner parimutuel settlement')
        )
      )
      ON CONFLICT (sports_event_id, template_id)
      DO UPDATE SET
        event_id = EXCLUDED.event_id,
        status = 'skipped',
        detail = EXCLUDED.detail,
        updated_at = now();
      CONTINUE;
    END IF;

    close_time_value := CASE
      WHEN template_row.auto_close_mode = 'event_start' THEN sports_event_row.scheduled_start
      ELSE sports_event_row.scheduled_start
    END;

    open_at_value := sports_event_row.scheduled_start - make_interval(mins => template_row.auto_open_offset_minutes);

    SELECT *
    INTO generation_row
    FROM public.sports_market_generation_runs
    WHERE sports_event_id = p_sports_event_id
      AND template_id = template_row.id;

    SELECT *
    INTO market_row
    FROM public.markets
    WHERE event_id = container_row.id
      AND auto_managed = true
      AND name = template_row.display_name
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.markets(
        event_id,
        name,
        description,
        status,
        total_pool,
        min_stake,
        max_stake,
        close_time,
        pool_type,
        rake_percent,
        auto_managed,
        trading_status_reason,
        bet_delay_seconds,
        suspend_on_live_state,
        result_derivation
      )
      VALUES (
        container_row.id,
        template_row.display_name,
        format('Auto-generated %s market', template_row.display_name),
        CASE
          WHEN open_at_value IS NOT NULL AND now() >= open_at_value AND now() < COALESCE(close_time_value, now() + interval '10 years')
            THEN 'open'
          ELSE 'draft'
        END,
        0,
        10,
        10000,
        close_time_value,
        COALESCE(template_config->>'pool_type', 'winner'),
        container_row.takeout,
        true,
        NULL,
        0,
        jsonb_build_object(
          'live', 'close',
          'paused', 'close',
          'cancelled', 'void'
        ),
        jsonb_build_object(
          'mode', 'winner',
          'template_key', template_row.market_key,
          'settlement_mode', template_row.settlement_mode,
          'include_draw', COALESCE((template_config->>'include_draw')::boolean, false)
        )
      )
      RETURNING * INTO market_row;

      generated_count := generated_count + 1;
    ELSE
      UPDATE public.markets
      SET
        description = format('Auto-generated %s market', template_row.display_name),
        close_time = close_time_value,
        pool_type = COALESCE(template_config->>'pool_type', market_row.pool_type),
        rake_percent = container_row.takeout,
        auto_managed = true,
        result_derivation = jsonb_build_object(
          'mode', 'winner',
          'template_key', template_row.market_key,
          'settlement_mode', template_row.settlement_mode,
          'include_draw', COALESCE((template_config->>'include_draw')::boolean, false)
        )
      WHERE id = market_row.id
      RETURNING * INTO market_row;

      updated_count := updated_count + 1;
    END IF;

    FOR participant_record IN
      SELECT
        sep.slot,
        sep.side,
        sep.role,
        sep.live_rank,
        sep.score,
        sp.*
      FROM public.sports_event_participants sep
      JOIN public.sports_participants sp ON sp.id = sep.participant_id
      WHERE sep.event_id = p_sports_event_id
      ORDER BY
        COALESCE(sep.slot, 1000),
        COALESCE(sep.live_rank, 1000),
        sp.display_name
    LOOP
      SELECT *
      INTO outcome_row
      FROM public.outcomes
      WHERE market_id = market_row.id
        AND sports_participant_id = participant_record.id
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO public.outcomes(
          market_id,
          label,
          color,
          metadata,
          participant_type,
          participant_id,
          sports_participant_id,
          result_key,
          display_order
        )
        VALUES (
          market_row.id,
          participant_record.display_name,
          COALESCE(participant_record.primary_color, '#9BD6FF'),
          jsonb_build_object(
            'short_label', participant_record.short_name,
            'abbreviation', participant_record.abbreviation,
            'side', participant_record.side,
            'role', participant_record.role,
            'image_url', participant_record.image_url
          ),
          participant_record.participant_type,
          participant_record.provider_participant_id,
          participant_record.id,
          participant_record.provider_participant_id,
          participant_record.slot
        )
        RETURNING * INTO outcome_row;
      ELSE
        UPDATE public.outcomes
        SET
          label = participant_record.display_name,
          color = COALESCE(participant_record.primary_color, outcome_row.color),
          participant_type = participant_record.participant_type,
          participant_id = participant_record.provider_participant_id,
          result_key = participant_record.provider_participant_id,
          display_order = participant_record.slot,
          metadata = COALESCE(outcome_row.metadata, '{}'::jsonb) || jsonb_build_object(
            'short_label', participant_record.short_name,
            'abbreviation', participant_record.abbreviation,
            'side', participant_record.side,
            'role', participant_record.role,
            'image_url', participant_record.image_url
          )
        WHERE id = outcome_row.id;
      END IF;
    END LOOP;

    IF COALESCE((template_config->>'include_draw')::boolean, false) THEN
      SELECT *
      INTO draw_outcome
      FROM public.outcomes
      WHERE market_id = market_row.id
        AND result_key = 'draw'
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO public.outcomes(
          market_id,
          label,
          color,
          metadata,
          participant_type,
          participant_id,
          sports_participant_id,
          result_key,
          display_order
        )
        VALUES (
          market_row.id,
          'Draw',
          '#6B7280',
          jsonb_build_object('synthetic', true),
          'custom',
          'draw',
          NULL,
          'draw',
          999
        );
      END IF;
    END IF;

    INSERT INTO public.sports_market_generation_runs(
      sports_event_id,
      template_id,
      event_id,
      status,
      detail
    )
    VALUES (
      p_sports_event_id,
      template_row.id,
      container_row.id,
      CASE WHEN generated_count > 0 THEN 'generated' ELSE 'updated' END,
      jsonb_build_object(
        'market_id', market_row.id,
        'open_at', open_at_value,
        'close_time', close_time_value
      )
    )
    ON CONFLICT (sports_event_id, template_id)
    DO UPDATE SET
      event_id = EXCLUDED.event_id,
      status = EXCLUDED.status,
      detail = EXCLUDED.detail,
      updated_at = now();
  END LOOP;

  PERFORM public.sports_refresh_event_market_state(p_sports_event_id);

  RETURN jsonb_build_object(
    'event_id', container_row.id,
    'generated_markets', generated_count,
    'updated_markets', updated_count,
    'skipped_templates', skipped_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_refresh_event_market_state(p_sports_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sports_event_row public.sports_events;
  container_row public.events;
  pool_row public.markets;
  open_at_value timestamptz;
  transitioned integer := 0;
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
    RETURN jsonb_build_object('event_id', NULL, 'transitions', 0);
  END IF;

  UPDATE public.events
  SET
    title = sports_event_row.title,
    starts_at = sports_event_row.scheduled_start,
    external_status = sports_event_row.status::text
  WHERE id = container_row.id
  RETURNING * INTO container_row;

  FOR pool_row IN
    SELECT *
    FROM public.markets
    WHERE event_id = container_row.id
      AND auto_managed = true
    ORDER BY created_at
  LOOP
    open_at_value := COALESCE(pool_row.close_time, sports_event_row.scheduled_start) - interval '3 hours';

    IF sports_event_row.status = 'cancelled' THEN
      PERFORM public.sports_auto_void_pool(pool_row.id, 'event_cancelled');
      transitioned := transitioned + 1;
      CONTINUE;
    END IF;

    IF sports_event_row.status IN ('live', 'paused', 'completed', 'official') THEN
      IF pool_row.status IN ('draft', 'open', 'suspended') THEN
        PERFORM public.sports_sync_pool_transition(pool_row.id, 'closed', sports_event_row.status::text);
        transitioned := transitioned + 1;
      END IF;
      CONTINUE;
    END IF;

    IF pool_row.status IN ('settled', 'void') THEN
      CONTINUE;
    END IF;

    IF pool_row.close_time IS NOT NULL AND now() >= pool_row.close_time THEN
      IF pool_row.status IN ('draft', 'open', 'suspended') THEN
        PERFORM public.sports_sync_pool_transition(pool_row.id, 'closed', 'pre_start_lock');
        transitioned := transitioned + 1;
      END IF;
    ELSIF now() >= open_at_value THEN
      IF pool_row.status IN ('draft', 'suspended') THEN
        PERFORM public.sports_sync_pool_transition(pool_row.id, 'open', NULL);
        transitioned := transitioned + 1;
      END IF;
    END IF;
  END LOOP;

  PERFORM public.market_refresh_container_status(container_row.id);

  RETURN jsonb_build_object(
    'event_id', container_row.id,
    'transitions', transitioned,
    'sports_status', sports_event_row.status
  );
END;
$$;

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
      SELECT COUNT(*), MAX(o.id)
      INTO candidate_count, winning_outcome_id
      FROM public.outcomes o
      JOIN public.sports_event_results ser
        ON ser.participant_id = o.sports_participant_id
       AND ser.event_id = p_sports_event_id
      WHERE o.market_id = pool_row.id
        AND ser.result_status = 'official'
        AND ser.result_position = 1;

      IF candidate_count <> 1 THEN
        winning_outcome_id := NULL;
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

GRANT EXECUTE ON FUNCTION public.sports_can_manage_feeds() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sports_upsert_event_container(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sports_generate_markets_for_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sports_refresh_event_market_state(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sports_settle_event_markets(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sports_sync_pool_transition(uuid, public.market_status, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sports_auto_settle_pool(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.sports_auto_void_pool(uuid, text) TO service_role;
