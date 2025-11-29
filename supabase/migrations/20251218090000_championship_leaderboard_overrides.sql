-- Manual leaderboard override tables and updated standings views.

-- Driver overrides -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_driver_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.championship_seasons(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.championship_drivers(id) ON DELETE CASCADE,
  manual_points double precision,
  manual_position integer,
  is_manual_override boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, driver_id)
);

DROP TRIGGER IF EXISTS trg_championship_driver_overrides_updated_at ON public.championship_driver_overrides;
CREATE TRIGGER trg_championship_driver_overrides_updated_at
BEFORE UPDATE ON public.championship_driver_overrides
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_driver_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS championship_driver_overrides_admin ON public.championship_driver_overrides;
CREATE POLICY championship_driver_overrides_admin
  ON public.championship_driver_overrides
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

DROP POLICY IF EXISTS championship_driver_overrides_read ON public.championship_driver_overrides;
CREATE POLICY championship_driver_overrides_read
  ON public.championship_driver_overrides
  FOR SELECT
  USING (true);

-- Team overrides -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_team_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.championship_seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.championship_teams(id) ON DELETE CASCADE,
  manual_points double precision,
  manual_position integer,
  is_manual_override boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);

DROP TRIGGER IF EXISTS trg_championship_team_overrides_updated_at ON public.championship_team_overrides;
CREATE TRIGGER trg_championship_team_overrides_updated_at
BEFORE UPDATE ON public.championship_team_overrides
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_team_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS championship_team_overrides_admin ON public.championship_team_overrides;
CREATE POLICY championship_team_overrides_admin
  ON public.championship_team_overrides
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

DROP POLICY IF EXISTS championship_team_overrides_read ON public.championship_team_overrides;
CREATE POLICY championship_team_overrides_read
  ON public.championship_team_overrides
  FOR SELECT
  USING (true);

-- Views ----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.driver_standings_view AS
WITH driver_points AS (
  SELECT
    d.id AS driver_id,
    d.driver_name,
    d.season_id,
    d.team_id,
    ct.name AS team_name,
    COALESCE(ct.primary_color, '#FFFFFF') AS team_color,
    COALESCE(SUM(r.points_awarded), 0)::double precision AS computed_points,
    COUNT(r.*) AS starts,
    COUNT(*) FILTER (WHERE r.finish_position = 1) AS wins,
    COUNT(*) FILTER (WHERE r.finish_position BETWEEN 1 AND 3) AS podiums,
    COUNT(*) FILTER (
      WHERE COALESCE(r.status, '') ILIKE 'dnf%'
        OR COALESCE(r.status, '') ILIKE 'dsq%'
    ) AS dnf_count,
    COUNT(*) FILTER (WHERE r.grid_position = 1) AS poles
  FROM public.championship_drivers d
  LEFT JOIN public.championship_teams ct ON ct.id = d.team_id
  LEFT JOIN public.championship_results r ON r.driver_id = d.id
  GROUP BY d.id, d.driver_name, d.season_id, d.team_id, ct.name, ct.primary_color
),
driver_with_overrides AS (
  SELECT
    dp.*,
    o.is_manual_override,
    o.manual_points,
    o.manual_position,
    COALESCE(
      CASE
        WHEN o.is_manual_override AND o.manual_points IS NOT NULL THEN o.manual_points
        ELSE NULL
      END,
      dp.computed_points
    ) AS display_points
  FROM driver_points dp
  LEFT JOIN public.championship_driver_overrides o
    ON o.season_id = dp.season_id
   AND o.driver_id = dp.driver_id
),
ranked AS (
  SELECT
    dwo.*,
    RANK() OVER (
      PARTITION BY season_id
      ORDER BY display_points DESC, wins DESC, podiums DESC, starts DESC
    ) AS computed_position,
    FIRST_VALUE(display_points) OVER (
      PARTITION BY season_id
      ORDER BY display_points DESC
    ) AS leader_points
  FROM driver_with_overrides dwo
)
SELECT
  driver_id,
  driver_name,
  team_id,
  team_name,
  team_color,
  season_id,
  CASE
    WHEN is_manual_override AND manual_position IS NOT NULL THEN manual_position
    ELSE computed_position
  END AS position,
  display_points AS points,
  wins,
  podiums,
  starts,
  dnf_count,
  poles,
  CASE
    WHEN leader_points IS NULL THEN NULL
    WHEN display_points = leader_points THEN 0
    ELSE (leader_points - display_points)
  END::double precision AS diff_to_leader,
  is_manual_override,
  manual_points,
  manual_position,
  computed_points,
  computed_position
FROM ranked;

CREATE OR REPLACE VIEW public.team_standings_view AS
WITH team_points AS (
  SELECT
    ct.id AS team_id,
    ct.name AS team_name,
    COALESCE(ct.primary_color, '#FFFFFF') AS team_color,
    ct.season_id,
    COALESCE(SUM(r.points_awarded), 0)::double precision AS computed_points,
    COUNT(r.*) AS starts,
    COUNT(*) FILTER (WHERE r.finish_position = 1) AS wins,
    COUNT(*) FILTER (WHERE r.finish_position BETWEEN 1 AND 3) AS podiums
  FROM public.championship_teams ct
  LEFT JOIN public.championship_results r ON r.team_id = ct.id
  GROUP BY ct.id, ct.name, ct.primary_color, ct.season_id
),
team_with_overrides AS (
  SELECT
    tp.*,
    o.is_manual_override,
    o.manual_points,
    o.manual_position,
    COALESCE(
      CASE
        WHEN o.is_manual_override AND o.manual_points IS NOT NULL THEN o.manual_points
        ELSE NULL
      END,
      tp.computed_points
    ) AS display_points
  FROM team_points tp
  LEFT JOIN public.championship_team_overrides o
    ON o.season_id = tp.season_id
   AND o.team_id = tp.team_id
),
ranked AS (
  SELECT
    two.*,
    RANK() OVER (
      PARTITION BY season_id
      ORDER BY display_points DESC, wins DESC, podiums DESC, starts DESC
    ) AS computed_position,
    FIRST_VALUE(display_points) OVER (
      PARTITION BY season_id
      ORDER BY display_points DESC
    ) AS leader_points
  FROM team_with_overrides two
)
SELECT
  team_id,
  team_name,
  team_color,
  season_id,
  CASE
    WHEN is_manual_override AND manual_position IS NOT NULL THEN manual_position
    ELSE computed_position
  END AS position,
  display_points AS points,
  wins,
  podiums,
  starts,
  CASE
    WHEN leader_points IS NULL THEN NULL
    WHEN display_points = leader_points THEN 0
    ELSE (leader_points - display_points)
  END::double precision AS diff_to_leader,
  is_manual_override,
  manual_points,
  manual_position,
  computed_points,
  computed_position
FROM ranked;
