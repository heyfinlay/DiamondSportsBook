-- ============================================================================
-- EXTERNAL EVENT REVIEW + WALLET ADMIN CONTROLS
-- Adds admin review/publish controls for external-feed events and a wallet
-- source-of-truth admin surface with manual balance adjustments.
-- ============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS events_published_idx ON public.events(published);
CREATE INDEX IF NOT EXISTS events_source_published_idx ON public.events(source_type, published);

UPDATE public.events
SET published_at = COALESCE(published_at, created_at)
WHERE published = true
  AND published_at IS NULL;

UPDATE public.events
SET
  published = false,
  published_at = NULL,
  published_by = NULL
WHERE source_type = 'external_feed'
  AND auto_created = true;

CREATE OR REPLACE VIEW public.wallet_admin_accounts AS
SELECT
  wa.id AS account_id,
  wa.user_id,
  wa.created_at,
  COALESCE(SUM(wt.amount), 0)::numeric(14,2) AS balance,
  COUNT(wt.id)::integer AS transaction_count,
  MAX(wt.created_at) AS last_transaction_at
FROM public.wallet_accounts wa
LEFT JOIN public.wallet_transactions wt ON wt.account_id = wa.id
GROUP BY wa.id, wa.user_id, wa.created_at;

GRANT SELECT ON public.wallet_admin_accounts TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_admin_adjust_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text,
  p_note text DEFAULT NULL
) RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  normalized_reason text := NULLIF(trim(COALESCE(p_reason, '')), '');
  normalized_note text := NULLIF(trim(COALESCE(p_note, '')), '');
  tx public.wallet_transactions;
  meta jsonb;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (
    public.has_permission('sportsbook_admin')
    OR public.has_permission('betting_admin')
    OR public.has_permission('super_admin')
  ) THEN
    RAISE EXCEPTION 'Requires admin permission';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero';
  END IF;

  IF normalized_reason IS NULL THEN
    RAISE EXCEPTION 'Adjustment reason is required';
  END IF;

  meta := jsonb_build_object(
    'reason', normalized_reason,
    'note', normalized_note,
    'actor_id', actor,
    'source', 'wallet_admin_adjustment'
  );

  IF p_amount > 0 THEN
    tx := public.wallet_credit(p_user_id, p_amount, meta);
  ELSE
    tx := public.wallet_debit(p_user_id, ABS(p_amount), meta);
  END IF;

  RETURN tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_admin_publish_event(p_event_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  event_row public.events;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (
    public.has_permission('sportsbook_admin')
    OR public.has_permission('betting_admin')
    OR public.has_permission('super_admin')
  ) THEN
    RAISE EXCEPTION 'Requires admin permission';
  END IF;

  SELECT * INTO event_row
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  UPDATE public.events
  SET
    published = true,
    published_at = COALESCE(published_at, now()),
    published_by = actor
  WHERE id = p_event_id
  RETURNING * INTO event_row;

  IF event_row.sports_event_id IS NOT NULL THEN
    PERFORM public.sports_refresh_event_market_state(event_row.sports_event_id);
  ELSE
    PERFORM public.market_refresh_container_status(event_row.id);
  END IF;

  RETURN (
    SELECT * FROM public.events WHERE id = p_event_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sports_admin_unpublish_event(p_event_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  event_row public.events;
  active_handle numeric := 0;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (
    public.has_permission('sportsbook_admin')
    OR public.has_permission('betting_admin')
    OR public.has_permission('super_admin')
  ) THEN
    RAISE EXCEPTION 'Requires admin permission';
  END IF;

  SELECT * INTO event_row
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  SELECT COALESCE(SUM(total_pool), 0)
  INTO active_handle
  FROM public.markets
  WHERE event_id = p_event_id
    AND auto_managed = true
    AND status NOT IN ('void', 'settled');

  IF active_handle > 0 THEN
    RAISE EXCEPTION 'Cannot unpublish an event once pool activity exists';
  END IF;

  UPDATE public.events
  SET
    published = false,
    published_at = NULL,
    published_by = NULL
  WHERE id = p_event_id
  RETURNING * INTO event_row;

  UPDATE public.markets
  SET
    status = 'draft',
    trading_status_reason = 'awaiting_admin_publish'
  WHERE event_id = p_event_id
    AND auto_managed = true
    AND status NOT IN ('settled', 'void');

  PERFORM public.market_refresh_container_status(p_event_id);

  RETURN (
    SELECT * FROM public.events WHERE id = p_event_id
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
    'sports_status', sports_event_row.status,
    'published', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust_balance(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sports_admin_publish_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sports_admin_unpublish_event(uuid) TO authenticated;
