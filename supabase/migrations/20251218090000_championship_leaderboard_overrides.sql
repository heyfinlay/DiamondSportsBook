-- Manual leaderboard overrides live directly on the championship driver/team entries.

DROP TABLE IF EXISTS public.championship_driver_overrides;
DROP TABLE IF EXISTS public.championship_team_overrides;

ALTER TABLE public.championship_drivers
  ADD COLUMN IF NOT EXISTS manual_points double precision,
  ADD COLUMN IF NOT EXISTS manual_position integer,
  ADD COLUMN IF NOT EXISTS use_manual_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.championship_teams
  ADD COLUMN IF NOT EXISTS manual_points double precision,
  ADD COLUMN IF NOT EXISTS manual_position integer,
  ADD COLUMN IF NOT EXISTS use_manual_override boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.team_standings_view;
DROP VIEW IF EXISTS public.driver_standings_view;

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
    d.manual_points,
    d.manual_position,
    d.use_manual_override,
    CASE
      WHEN d.use_manual_override AND d.manual_points IS NOT NULL THEN d.manual_points
      ELSE dp.computed_points
    END AS display_points
  FROM driver_points dp
  JOIN public.championship_drivers d ON d.id = dp.driver_id
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
    WHEN use_manual_override AND manual_position IS NOT NULL THEN manual_position
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
  use_manual_override AS is_manual_override,
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
    ct.manual_points,
    ct.manual_position,
    ct.use_manual_override,
    CASE
      WHEN ct.use_manual_override AND ct.manual_points IS NOT NULL THEN ct.manual_points
      ELSE tp.computed_points
    END AS display_points
  FROM team_points tp
  JOIN public.championship_teams ct ON ct.id = tp.team_id
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
    WHEN use_manual_override AND manual_position IS NOT NULL THEN manual_position
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
  use_manual_override AS is_manual_override,
  manual_points,
  manual_position,
  computed_points,
  computed_position
FROM ranked;
