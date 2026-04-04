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

  IF NOT container_row.published THEN
    UPDATE public.markets
    SET
      status = 'draft',
      trading_status_reason = 'awaiting_admin_publish'
    WHERE event_id = container_row.id
      AND auto_managed = true
      AND status NOT IN ('settled', 'void');

    PERFORM public.market_refresh_container_status(container_row.id);

    RETURN jsonb_build_object(
      'event_id', container_row.id,
      'transitions', transitioned,
      'sports_status', sports_event_row.status,
      'published', false
    );
  END IF;

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
      IF pool_row.status IN ('draft', 'suspended', 'closed') THEN
        PERFORM public.sports_sync_pool_transition(pool_row.id, 'open', NULL);
        transitioned := transitioned + 1;
      END IF;
    END IF;
  END LOOP;

  PERFORM public.market_refresh_container_status(container_row.id);

  RETURN jsonb_build_object(
    'event_id', container_row.id,
    'transitions', transitioned,
    'sports_status', sports_event_row.status,
    'published', true
  );
END;
$$;
