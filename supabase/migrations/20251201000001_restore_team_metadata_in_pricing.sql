-- Restore team metadata columns in pricing helpers so UI outcomes can render team/driver details.
CREATE OR REPLACE FUNCTION public.get_pools_pricing()
RETURNS TABLE (
  pool_id uuid,
  pool_name text,
  pool_status public.market_status,
  rake_percent numeric,
  close_time timestamptz,
  updated_at timestamptz,
  total_stake numeric,
  total_bets bigint,
  last_activity_at timestamptz,
  outcome_id uuid,
  outcome_label text,
  team_name text,
  team_color text,
  driver_name text,
  outcome_stake numeric,
  outcome_bets bigint,
  baseline_odds numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH wager_pool AS (
    SELECT
      w.market_id AS pool_id,
      SUM(w.stake) AS total_stake,
      COUNT(*) AS total_bets,
      MAX(w.created_at) AS last_activity_at
    FROM public.wagers w
    WHERE w.status IN ('pending', 'accepted', 'won', 'lost', 'void_refund')
    GROUP BY w.market_id
  ),
  wager_outcome AS (
    SELECT
      w.market_id AS pool_id,
      w.outcome_id,
      SUM(w.stake) AS outcome_stake,
      COUNT(*) AS outcome_bets
    FROM public.wagers w
    WHERE w.status IN ('pending', 'accepted', 'won', 'lost', 'void_refund')
    GROUP BY w.market_id, w.outcome_id
  )
  SELECT
    m.id AS pool_id,
    m.name AS pool_name,
    m.status AS pool_status,
    COALESCE(m.rake_percent, e.takeout) AS rake_percent,
    m.close_time,
    m.updated_at,
    COALESCE(p.total_stake, 0) AS total_stake,
    COALESCE(p.total_bets, 0) AS total_bets,
    COALESCE(p.last_activity_at, m.updated_at) AS last_activity_at,
    o.id AS outcome_id,
    o.label AS outcome_label,
    COALESCE(o.metadata->>'team_name', o.label) AS team_name,
    COALESCE(o.metadata->>'team_color', o.color) AS team_color,
    COALESCE(o.metadata->>'driver_name', o.label) AS driver_name,
    COALESCE(o_stats.outcome_stake, 0) AS outcome_stake,
    COALESCE(o_stats.outcome_bets, 0) AS outcome_bets,
    CASE
      WHEN COALESCE(o_stats.outcome_stake, 0) <= 0 THEN 0
      ELSE
        (COALESCE(p.total_stake, 0) * (1 - COALESCE(m.rake_percent, e.takeout, 0))) /
        NULLIF(o_stats.outcome_stake, 0)
    END AS baseline_odds
  FROM public.markets m
  JOIN public.events e ON e.id = m.event_id
  LEFT JOIN wager_pool p ON p.pool_id = m.id
  JOIN public.outcomes o ON o.market_id = m.id
  LEFT JOIN wager_outcome o_stats ON o_stats.pool_id = m.id AND o_stats.outcome_id = o.id
  WHERE m.archived IS NOT TRUE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_pools_pricing() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pool_pricing(p_pool_id uuid)
RETURNS TABLE (
  pool_id uuid,
  pool_name text,
  pool_status public.market_status,
  rake_percent numeric,
  close_time timestamptz,
  updated_at timestamptz,
  total_stake numeric,
  total_bets bigint,
  last_activity_at timestamptz,
  outcome_id uuid,
  outcome_label text,
  team_name text,
  team_color text,
  driver_name text,
  outcome_stake numeric,
  outcome_bets bigint,
  baseline_odds numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_pools_pricing() WHERE pool_id = p_pool_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_pool_pricing(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_recent_pool_bets(
  p_pool_id uuid,
  p_limit integer DEFAULT 50
) RETURNS TABLE (
  id uuid,
  pool_id uuid,
  outcome_id uuid,
  team_name text,
  team_color text,
  driver_name text,
  amount numeric,
  odds_at_placement numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.market_id AS pool_id,
    w.outcome_id,
    COALESCE(o.metadata->>'team_name', o.label) AS team_name,
    COALESCE(o.metadata->>'team_color', o.color) AS team_color,
    COALESCE(o.metadata->>'driver_name', o.label) AS driver_name,
    w.stake AS amount,
    COALESCE(w.effective_odds, w.baseline_odds) AS odds_at_placement,
    w.created_at
  FROM public.wagers w
  JOIN public.outcomes o ON o.id = w.outcome_id
  WHERE w.market_id = p_pool_id
    AND w.status IN ('pending', 'accepted', 'won', 'lost', 'void_refund')
  ORDER BY w.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_recent_pool_bets(uuid, integer) TO anon, authenticated;
