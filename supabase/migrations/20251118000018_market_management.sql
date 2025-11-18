-- ============================================================================
-- 0016: Market Management + Admin tooling
-- ============================================================================

-- Extend user roles with sportsbook_admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sportsbook_admin';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Allow sportsbook_admins to satisfy betting_admin permission checks
CREATE OR REPLACE FUNCTION public.has_permission(target_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO actor
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF actor.role = 'super_admin' THEN
    RETURN true;
  END IF;

  IF target_permission IS NULL THEN
    RETURN false;
  END IF;

  IF actor.role = 'sportsbook_admin' AND target_permission = 'betting_admin' THEN
    RETURN true;
  END IF;

  RETURN target_permission = actor.role::text
    OR target_permission = ANY(actor.permissions);
END;
$$;

-- Market containers state enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_container_status') THEN
    CREATE TYPE public.market_container_status AS ENUM ('draft', 'upcoming', 'active', 'in_settlement', 'settled', 'archived');
  END IF;
END $$;

-- Extend pool and wager enums
DO $$
BEGIN
  ALTER TYPE public.market_status ADD VALUE IF NOT EXISTS 'settlement_proposed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.market_status ADD VALUE IF NOT EXISTS 'void';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.wager_status ADD VALUE IF NOT EXISTS 'void_refund';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enrich events (market containers)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status public.market_container_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_event_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE PROCEDURE public.touch_event_updated_at();

CREATE INDEX IF NOT EXISTS events_status_idx ON public.events(status);

-- Enrich pools/markets
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS pool_type text NOT NULL DEFAULT 'winner',
  ADD COLUMN IF NOT EXISTS rake_percent numeric(5,4) NOT NULL DEFAULT 0.12,
  ADD COLUMN IF NOT EXISTS settlement_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_market_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_markets_updated_at ON public.markets;
CREATE TRIGGER trg_markets_updated_at
BEFORE UPDATE ON public.markets
FOR EACH ROW
EXECUTE PROCEDURE public.touch_market_updated_at();

-- Outcome visuals
ALTER TABLE public.outcomes
  ADD COLUMN IF NOT EXISTS color text;

-- Pending settlements reference pools + aggregates
ALTER TABLE public.pending_settlements
  RENAME COLUMN market_id TO pool_id;

ALTER TABLE public.pending_settlements
  ADD COLUMN IF NOT EXISTS market_container_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS handle numeric(14,2),
  ADD COLUMN IF NOT EXISTS rake_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS distribution_pool numeric(14,2),
  ADD COLUMN IF NOT EXISTS payout_per_unit numeric(14,6);

UPDATE public.pending_settlements ps
SET market_container_id = m.event_id
FROM public.markets m
WHERE ps.pool_id = m.id AND ps.market_container_id IS NULL;

ALTER TABLE public.pending_settlements
  ALTER COLUMN market_container_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pending_settlements_pool_idx ON public.pending_settlements(pool_id);

-- Ledger for rake / house earnings
CREATE TABLE IF NOT EXISTS public.market_rake_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  pool_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_rake_ledger_market_idx ON public.market_rake_ledger(market_id);
CREATE INDEX IF NOT EXISTS market_rake_ledger_pool_idx ON public.market_rake_ledger(pool_id);

ALTER TABLE public.market_rake_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Rake ledger readable by admin" ON public.market_rake_ledger
    FOR SELECT
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Helper: refresh container status based on pool states
CREATE OR REPLACE FUNCTION public.market_refresh_container_status(p_container_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  container_row public.events;
  open_count integer;
  settlement_count integer;
  completed_count integer;
  total_count integer;
  new_status public.market_container_status := 'draft';
BEGIN
  SELECT * INTO container_row
  FROM public.events
  WHERE id = p_container_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market container not found';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
    COUNT(*) FILTER (WHERE status IN ('settlement_proposed', 'closed')) AS settlement_count,
    COUNT(*) FILTER (WHERE status IN ('settled', 'void')) AS completed_count,
    COUNT(*) AS total_count
  INTO open_count, settlement_count, completed_count, total_count
  FROM public.markets
  WHERE event_id = p_container_id;

  IF open_count > 0 THEN
    new_status := 'active';
  ELSIF settlement_count > 0 THEN
    new_status := 'in_settlement';
  ELSIF total_count > 0 AND total_count = completed_count THEN
    new_status := 'settled';
  ELSE
    new_status := 'upcoming';
  END IF;

  UPDATE public.events
  SET status = new_status
  WHERE id = p_container_id
  RETURNING * INTO container_row;

  RETURN container_row;
END;
$$;

-- Preview settlement helper
CREATE OR REPLACE FUNCTION public.market_pool_preview_settlement(
  p_pool_id uuid,
  p_winning_outcome uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  pool_row public.markets;
  outcome_row public.outcomes;
  handle numeric := 0;
  winning_total numeric := 0;
  rake numeric := 0;
  distribution numeric := 0;
  payout_per_unit numeric := 0;
  preview jsonb;
  rake_basis numeric;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  SELECT * INTO pool_row FROM public.markets WHERE id = p_pool_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  IF pool_row.status NOT IN ('closed', 'settlement_proposed') THEN
    RAISE EXCEPTION 'Pool must be closed before settlement';
  END IF;

  SELECT * INTO outcome_row FROM public.outcomes WHERE id = p_winning_outcome AND market_id = p_pool_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winning outcome not found for pool';
  END IF;

  SELECT coalesce(sum(stake), 0) INTO handle
  FROM public.wagers
  WHERE market_id = p_pool_id AND status IN ('accepted', 'pending');

  SELECT coalesce(sum(stake), 0) INTO winning_total
  FROM public.wagers
  WHERE market_id = p_pool_id AND outcome_id = p_winning_outcome AND status IN ('accepted', 'pending');

  rake_basis := COALESCE(pool_row.rake_percent, 0);
  rake := round(handle * rake_basis, 2);
  distribution := handle - rake;
  IF winning_total > 0 THEN
    payout_per_unit := distribution / winning_total;
  ELSE
    payout_per_unit := 0;
  END IF;

  preview := jsonb_build_object(
    'pool_id', p_pool_id,
    'market_id', pool_row.event_id,
    'outcome_id', p_winning_outcome,
    'outcome_label', outcome_row.label,
    'handle', handle,
    'rake_percent', rake_basis,
    'rake_amount', rake,
    'distribution_pool', distribution,
    'payout_per_unit', payout_per_unit,
    'winners', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'wager_id', w.id,
            'user_id', w.user_id,
            'stake', w.stake,
            'payout', w.stake * payout_per_unit
          )
        )
        FROM public.wagers w
        WHERE w.market_id = p_pool_id
          AND w.outcome_id = p_winning_outcome
          AND w.status IN ('accepted', 'pending')
      ),
      '[]'::jsonb
    )
  );

  RETURN preview;
END;
$$;

-- Propose settlement and persist preview
CREATE OR REPLACE FUNCTION public.market_pool_propose_settlement(
  p_pool_id uuid,
  p_winning_outcome uuid
) RETURNS public.pending_settlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  preview jsonb;
  pending_row public.pending_settlements;
  pool_row public.markets;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  SELECT * INTO pool_row FROM public.markets WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  IF pool_row.status NOT IN ('closed', 'settlement_proposed') THEN
    RAISE EXCEPTION 'Pool must be closed before proposing settlement';
  END IF;

  preview := public.market_pool_preview_settlement(p_pool_id, p_winning_outcome);

  INSERT INTO public.pending_settlements(
    pool_id,
    market_container_id,
    winning_outcome_id,
    proposed_by,
    status,
    summary,
    handle,
    rake_amount,
    distribution_pool,
    payout_per_unit
  ) VALUES (
    p_pool_id,
    pool_row.event_id,
    p_winning_outcome,
    actor,
    'proposed',
    preview,
    (preview->>'handle')::numeric,
    (preview->>'rake_amount')::numeric,
    (preview->>'distribution_pool')::numeric,
    (preview->>'payout_per_unit')::numeric
  )
  ON CONFLICT (pool_id)
  DO UPDATE SET
    winning_outcome_id = EXCLUDED.winning_outcome_id,
    proposed_by = EXCLUDED.proposed_by,
    proposed_at = now(),
    status = 'proposed',
    summary = EXCLUDED.summary,
    handle = EXCLUDED.handle,
    rake_amount = EXCLUDED.rake_amount,
    distribution_pool = EXCLUDED.distribution_pool,
    payout_per_unit = EXCLUDED.payout_per_unit
  RETURNING * INTO pending_row;

  UPDATE public.markets
  SET status = 'settlement_proposed'
  WHERE id = p_pool_id;

  PERFORM public.market_refresh_container_status(pool_row.event_id);

  RETURN pending_row;
END;
$$;

-- Confirm settlement and pay winners
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
  wager_record record;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  SELECT * INTO pending_row
  FROM public.pending_settlements
  WHERE pool_id = p_pool_id AND status = 'proposed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending settlement for pool';
  END IF;

  SELECT * INTO pool_row FROM public.markets WHERE id = p_pool_id FOR UPDATE;

  preview := pending_row.summary;
  handle := coalesce((preview->>'handle')::numeric, 0);
  rake_amount := coalesce((preview->>'rake_amount')::numeric, 0);
  distribution := coalesce((preview->>'distribution_pool')::numeric, 0);
  payout_per_unit := coalesce((preview->>'payout_per_unit')::numeric, 0);

  FOR wager_record IN
    SELECT * FROM public.wagers
    WHERE market_id = p_pool_id AND status IN ('accepted', 'pending')
    FOR UPDATE
  LOOP
    IF wager_record.outcome_id = pending_row.winning_outcome_id THEN
      payout := round(wager_record.stake * payout_per_unit, 2);
      IF payout > 0 THEN
        PERFORM public.wallet_credit(
          wager_record.user_id,
          payout,
          jsonb_build_object(
            'market_id', wager_record.market_id,
            'pool_id', wager_record.market_id,
            'market_container_id', pool_row.event_id,
            'wager_id', wager_record.id,
            'type', 'pool_win'
          )
        );
      END IF;
      UPDATE public.wagers
      SET status = 'won', settled_payout = payout
      WHERE id = wager_record.id;
    ELSE
      UPDATE public.wagers
      SET status = 'lost', settled_payout = 0
      WHERE id = wager_record.id;
    END IF;
  END LOOP;

  UPDATE public.markets
  SET status = 'settled', settlement_payload = preview
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  UPDATE public.pending_settlements
  SET status = 'settled', approved_by = actor, approved_at = now()
  WHERE id = pending_row.id;

  IF rake_amount > 0 THEN
    INSERT INTO public.market_rake_ledger(market_id, pool_id, amount, meta)
    VALUES (
      pool_row.event_id,
      pool_row.id,
      rake_amount,
      jsonb_build_object('handle', handle, 'distribution_pool', distribution)
    );
  END IF;

  PERFORM public.market_refresh_container_status(pool_row.event_id);

  RETURN pool_row;
END;
$$;

-- Void pool helper
CREATE OR REPLACE FUNCTION public.market_pool_void(
  p_pool_id uuid,
  p_reason text DEFAULT NULL
) RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  pool_row public.markets;
  wager_record record;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  SELECT * INTO pool_row FROM public.markets WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  FOR wager_record IN
    SELECT * FROM public.wagers
    WHERE market_id = p_pool_id AND status IN ('accepted', 'pending')
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
        'reason', coalesce(p_reason, 'void')
      )
    );

    UPDATE public.wagers
    SET status = 'void_refund', settled_payout = wager_record.stake
    WHERE id = wager_record.id;
  END LOOP;

  DELETE FROM public.pending_settlements WHERE pool_id = p_pool_id;

  UPDATE public.outcomes
  SET pool = 0
  WHERE market_id = p_pool_id;

  UPDATE public.markets
  SET status = 'void',
      settlement_payload = jsonb_build_object('reason', coalesce(p_reason, 'void')),
      total_pool = 0
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  PERFORM public.market_refresh_container_status(pool_row.event_id);

  RETURN pool_row;
END;
$$;

-- Simple state transitions
CREATE OR REPLACE FUNCTION public.market_pool_open(p_pool_id uuid)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  pool_row public.markets;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  UPDATE public.markets
  SET status = 'open'
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  PERFORM public.market_refresh_container_status(pool_row.event_id);
  RETURN pool_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.market_pool_close(p_pool_id uuid)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  pool_row public.markets;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  UPDATE public.markets
  SET status = 'closed'
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  PERFORM public.market_refresh_container_status(pool_row.event_id);
  RETURN pool_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.market_pool_suspend(p_pool_id uuid)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  pool_row public.markets;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  UPDATE public.markets
  SET status = 'suspended'
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  PERFORM public.market_refresh_container_status(pool_row.event_id);
  RETURN pool_row;
END;
$$;

-- Market creation wizard
CREATE OR REPLACE FUNCTION public.market_create_from_session(
  p_session_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_takeout numeric DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_pools jsonb DEFAULT '[]'::jsonb
) RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  session_row public.timing_sessions;
  event_row public.events;
  pool_item jsonb;
  pool_row public.markets;
  driver_record record;
  pool_count integer := 0;
  takeout numeric;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  SELECT * INTO session_row FROM public.timing_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  takeout := COALESCE(p_takeout, 0.12);

  INSERT INTO public.events(
    session_id,
    title,
    description,
    starts_at,
    takeout,
    status,
    created_by
  ) VALUES (
    p_session_id,
    COALESCE(p_title, session_row.name),
    p_description,
    COALESCE(p_starts_at, session_row.starts_at),
    takeout,
    'draft',
    actor
  ) RETURNING * INTO event_row;

  FOR pool_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_pools, '[]'::jsonb))
  LOOP
    pool_count := pool_count + 1;
    INSERT INTO public.markets(
      event_id,
      name,
      description,
      min_stake,
      max_stake,
      close_time,
      pool_type,
      rake_percent
    ) VALUES (
      event_row.id,
      pool_item->>'name',
      pool_item->>'description',
      COALESCE((pool_item->>'min_stake')::numeric, 10),
      COALESCE((pool_item->>'max_stake')::numeric, 10000),
      (pool_item->>'close_time')::timestamptz,
      COALESCE(NULLIF(pool_item->>'pool_type', ''), 'winner'),
      COALESCE((pool_item->>'rake_percent')::numeric, takeout)
    ) RETURNING * INTO pool_row;

    FOR driver_record IN
      SELECT id, name, number, COALESCE(primary_color, '#FFFFFF') AS color
      FROM public.timing_drivers
      WHERE session_id = p_session_id
      ORDER BY number NULLS LAST, name
    LOOP
      INSERT INTO public.outcomes(
        market_id,
        label,
        driver_id,
        color,
        metadata
      ) VALUES (
        pool_row.id,
        driver_record.name,
        driver_record.id,
        driver_record.color,
        jsonb_build_object(
          'driver_number', driver_record.number,
          'session_id', p_session_id
        )
      );
    END LOOP;
  END LOOP;

  IF pool_count = 0 THEN
    RAISE EXCEPTION 'At least one pool definition required';
  END IF;

  PERFORM public.market_refresh_container_status(event_row.id);

  RETURN (
    SELECT * FROM public.events WHERE id = event_row.id
  );
END;
$$;

-- Admin wagers helper
CREATE OR REPLACE FUNCTION public.market_admin_wagers(
  p_market_id uuid,
  p_pool_id uuid DEFAULT NULL
) RETURNS TABLE (
  wager_id uuid,
  pool_id uuid,
  pool_name text,
  outcome_id uuid,
  outcome_label text,
  user_id uuid,
  user_name text,
  stake numeric,
  status public.wager_status,
  created_at timestamptz
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
    w.id,
    w.market_id,
    m.name,
    w.outcome_id,
    o.label,
    w.user_id,
    p.display_name,
    w.stake,
    w.status,
    w.created_at
  FROM public.wagers w
  JOIN public.markets m ON m.id = w.market_id
  JOIN public.outcomes o ON o.id = w.outcome_id
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE m.event_id = p_market_id
    AND (p_pool_id IS NULL OR w.market_id = p_pool_id);
END;
$$;

-- Ensure sportsbook admins can read wagers
DO $$
BEGIN
  CREATE POLICY "Wagers readable by sportsbook admin" ON public.wagers
    FOR SELECT
    USING (
      public.has_permission('sportsbook_admin') OR
      public.has_permission('betting_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update betting preview RPC to use pool rake + metadata
CREATE OR REPLACE FUNCTION public.betting_preview_wager(
  p_market_id uuid,
  p_outcome_id uuid,
  p_stake numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_row public.markets;
  outcome_row public.outcomes;
  container_row public.events;
  rake numeric;
BEGIN
  SELECT * INTO pool_row FROM public.markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  SELECT * INTO container_row FROM public.events WHERE id = pool_row.event_id;
  rake := COALESCE(pool_row.rake_percent, container_row.takeout);

  IF pool_row.status <> 'open' THEN
    RAISE EXCEPTION 'Pool is not open';
  END IF;

  IF now() > COALESCE(pool_row.close_time, now() + interval '100 years') THEN
    RAISE EXCEPTION 'Pool closed';
  END IF;

  IF p_stake < pool_row.min_stake OR p_stake > pool_row.max_stake THEN
    RAISE EXCEPTION 'Stake outside limits';
  END IF;

  SELECT * INTO outcome_row FROM public.outcomes WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outcome not found';
  END IF;

  RETURN public.parimutuel_preview(
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
END;
$$;

-- Update wager placement RPC with new metadata
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
  preview jsonb;
  wager_row public.wagers;
  pool_row public.markets;
  container_row public.events;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  preview := public.betting_preview_wager(p_market_id, p_outcome_id, p_stake);

  SELECT * INTO pool_row FROM public.markets WHERE id = p_market_id;
  SELECT * INTO container_row FROM public.events WHERE id = pool_row.event_id;

  PERFORM * FROM public.wagers WHERE user_id = actor AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN (
      SELECT * FROM public.wagers
      WHERE user_id = actor AND idempotency_key = p_idempotency_key
    );
  END IF;

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

  UPDATE public.markets SET total_pool = total_pool + p_stake WHERE id = p_market_id;
  UPDATE public.outcomes SET pool = pool + p_stake WHERE id = p_outcome_id;

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
  ) RETURNING * INTO wager_row;

  RETURN wager_row;
END;
$$;

-- Keep legacy RPC intact but reuse new helpers
CREATE OR REPLACE FUNCTION public.betting_settle_market(
  p_market_id uuid,
  p_winning_outcome uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.market_pool_propose_settlement(p_market_id, p_winning_outcome);
  PERFORM public.market_pool_confirm_settlement(p_market_id);
END;
$$;

-- Grants for admin RPCs (permission enforced inside functions)
GRANT EXECUTE ON FUNCTION public.market_create_from_session(uuid, text, text, numeric, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_close(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_suspend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_void(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_preview_settlement(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_propose_settlement(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_pool_confirm_settlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.market_admin_wagers(uuid, uuid) TO authenticated;
