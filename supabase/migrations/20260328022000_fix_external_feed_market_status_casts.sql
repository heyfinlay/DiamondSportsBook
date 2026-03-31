CREATE OR REPLACE FUNCTION public.sports_generate_markets_for_event(p_sports_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sports_event_row public.sports_events;
  competition_row public.sports_competitions;
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
  home_name text;
  away_name text;
  participant_display_order integer;
  market_name_value text;
  market_description_value text;
  template_context jsonb;
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

  SELECT
    MAX(CASE WHEN sep.side = 'home' THEN sp.display_name END),
    MAX(CASE WHEN sep.side = 'away' THEN sp.display_name END)
  INTO home_name, away_name
  FROM public.sports_event_participants sep
  JOIN public.sports_participants sp ON sp.id = sep.participant_id
  WHERE sep.event_id = p_sports_event_id;

  IF home_name IS NULL THEN
    SELECT sp.display_name
    INTO home_name
    FROM public.sports_event_participants sep
    JOIN public.sports_participants sp ON sp.id = sep.participant_id
    WHERE sep.event_id = p_sports_event_id
    ORDER BY COALESCE(sep.live_rank, sep.slot, 1000), sp.display_name
    LIMIT 1;
  END IF;

  IF away_name IS NULL THEN
    SELECT sp.display_name
    INTO away_name
    FROM public.sports_event_participants sep
    JOIN public.sports_participants sp ON sp.id = sep.participant_id
    WHERE sep.event_id = p_sports_event_id
    ORDER BY COALESCE(sep.live_rank, sep.slot, 1000), sp.display_name
    OFFSET 1
    LIMIT 1;
  END IF;

  container_row := public.sports_upsert_event_container(p_sports_event_id);

  FOR template_row IN
    SELECT *
    FROM public.sports_market_templates
    WHERE sport_code = sports_event_row.sport_code
      AND event_type = sports_event_row.event_type
    ORDER BY
      COALESCE((config->>'sort_order')::integer, 1000),
      display_name
  LOOP
    template_config := COALESCE(template_row.config, '{}'::jsonb);
    supported := template_row.enabled
      AND COALESCE((template_config->>'requires_multi_winner')::boolean, false) = false
      AND COALESCE(template_config->>'pool_type', 'winner') IN ('winner', 'moneyline');

    template_context := jsonb_build_object(
      'event_title', sports_event_row.title,
      'competition_name', COALESCE(competition_row.name, ''),
      'round_label', COALESCE(sports_event_row.round_label, ''),
      'venue_name', COALESCE(sports_event_row.venue_name, ''),
      'home_name', COALESCE(home_name, ''),
      'away_name', COALESCE(away_name, '')
    );

    market_name_value := COALESCE(
      public.sports_apply_market_template_text(
        COALESCE(template_config->>'market_name_template', template_row.display_name),
        template_context
      ),
      template_row.display_name
    );

    market_description_value := COALESCE(
      public.sports_apply_market_template_text(
        COALESCE(
          template_config->>'market_description_template',
          format('Auto-generated %s market', template_row.display_name)
        ),
        template_context
      ),
      format('Auto-generated %s market', template_row.display_name)
    );

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
      AND COALESCE(result_derivation->>'template_key', '') = template_row.market_key
    LIMIT 1;

    IF NOT FOUND THEN
      SELECT *
      INTO market_row
      FROM public.markets
      WHERE event_id = container_row.id
        AND auto_managed = true
        AND name = market_name_value
      LIMIT 1;
    END IF;

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
        market_name_value,
        market_description_value,
        CASE
          WHEN open_at_value IS NOT NULL AND now() >= open_at_value AND now() < COALESCE(close_time_value, now() + interval '10 years')
            THEN 'open'
          ELSE 'draft'
        END::public.market_status,
        0,
        10,
        10000,
        close_time_value,
        COALESCE(NULLIF(template_config->>'pool_type', ''), 'winner')::public.pool_type_v2,
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
        name = market_name_value,
        description = market_description_value,
        close_time = close_time_value,
        pool_type = COALESCE(NULLIF(template_config->>'pool_type', ''), market_row.pool_type::text)::public.pool_type_v2,
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
        CASE
          WHEN sep.side = 'home' THEN 0
          WHEN sep.side = 'away' THEN 1
          ELSE 2
        END,
        COALESCE(sep.live_rank, sep.slot, 1000),
        sp.display_name
    LOOP
      participant_display_order := CASE
        WHEN participant_record.side = 'home' THEN 1
        WHEN participant_record.side = 'away' THEN 2
        ELSE COALESCE(participant_record.live_rank, participant_record.slot, 1000)
      END;

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
          participant_display_order
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
          display_order = participant_display_order,
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
          3
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
        'market_name', market_name_value,
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
