-- Extend driver stats overrides and ensure team standings respect driver overrides.

ALTER TABLE public.championship_drivers
  ADD COLUMN IF NOT EXISTS manual_wins integer,
  ADD COLUMN IF NOT EXISTS manual_podiums integer,
  ADD COLUMN IF NOT EXISTS manual_starts integer,
  ADD COLUMN IF NOT EXISTS manual_fastest_laps integer,
  ADD COLUMN IF NOT EXISTS use_manual_stats_override boolean NOT NULL DEFAULT false;

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
    COUNT(r.*) AS computed_starts,
    COUNT(*) FILTER (WHERE r.finish_position = 1) AS computed_wins,
    COUNT(*) FILTER (WHERE r.finish_position BETWEEN 1 AND 3) AS computed_podiums,
    COUNT(*) FILTER (
      WHERE COALESCE(r.status, '') ILIKE 'dnf%'
        OR COALESCE(r.status, '') ILIKE 'dsq%'
    ) AS dnf_count,
    COUNT(*) FILTER (WHERE r.grid_position = 1) AS poles,
    COUNT(*) FILTER (WHERE r.fastest_lap) AS computed_fastest_laps
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
    d.manual_wins,
    d.manual_podiums,
    d.manual_starts,
    d.manual_fastest_laps,
    d.use_manual_stats_override,
    CASE
      WHEN d.use_manual_override AND d.manual_points IS NOT NULL THEN d.manual_points
      ELSE dp.computed_points
    END AS display_points,
    CASE
      WHEN d.use_manual_override AND d.manual_position IS NOT NULL THEN d.manual_position
      ELSE NULL
    END AS position_override,
    CASE
      WHEN d.use_manual_stats_override AND d.manual_wins IS NOT NULL THEN d.manual_wins
      ELSE dp.computed_wins
    END AS display_wins,
    CASE
      WHEN d.use_manual_stats_override AND d.manual_podiums IS NOT NULL THEN d.manual_podiums
      ELSE dp.computed_podiums
    END AS display_podiums,
    CASE
      WHEN d.use_manual_stats_override AND d.manual_starts IS NOT NULL THEN d.manual_starts
      ELSE dp.computed_starts
    END AS display_starts,
    CASE
      WHEN d.use_manual_stats_override AND d.manual_fastest_laps IS NOT NULL THEN d.manual_fastest_laps
      ELSE dp.computed_fastest_laps
    END AS display_fastest_laps
  FROM driver_points dp
  JOIN public.championship_drivers d ON d.id = dp.driver_id
),
ranked AS (
  SELECT
    dwo.*,
    RANK() OVER (
      PARTITION BY season_id
      ORDER BY display_points DESC, display_wins DESC, display_podiums DESC, display_starts DESC
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
  display_wins AS wins,
  display_podiums AS podiums,
  display_starts AS starts,
  display_fastest_laps AS fastest_laps,
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
  manual_wins,
  manual_podiums,
  manual_starts,
  manual_fastest_laps,
  use_manual_stats_override,
  computed_points,
  computed_position,
  computed_wins,
  computed_podiums,
  computed_starts,
  computed_fastest_laps
FROM ranked;

CREATE OR REPLACE VIEW public.team_standings_view AS
WITH driver_standings AS (
  SELECT
    driver_id,
    team_id,
    season_id,
    points,
    computed_points,
    wins,
    computed_wins,
    podiums,
    computed_podiums,
    starts,
    computed_starts
  FROM public.driver_standings_view
),
team_points AS (
  SELECT
    ct.id AS team_id,
    ct.name AS team_name,
    COALESCE(ct.primary_color, '#FFFFFF') AS team_color,
    ct.season_id,
    COALESCE(SUM(ds.points), 0)::double precision AS display_points,
    COALESCE(SUM(ds.computed_points), 0)::double precision AS computed_points,
    COALESCE(SUM(ds.wins), 0)::integer AS wins,
    COALESCE(SUM(ds.podiums), 0)::integer AS podiums,
    COALESCE(SUM(ds.starts), 0)::integer AS starts
  FROM public.championship_teams ct
  LEFT JOIN driver_standings ds ON ds.team_id = ct.id
  GROUP BY ct.id, ct.name, ct.primary_color, ct.season_id
),
ranked AS (
  SELECT
    tp.*,
    ct.manual_points,
    ct.manual_position,
    ct.use_manual_override,
    CASE
      WHEN ct.use_manual_override AND ct.manual_points IS NOT NULL THEN ct.manual_points
      ELSE tp.display_points
    END AS final_points,
    RANK() OVER (
      PARTITION BY tp.season_id
      ORDER BY
        CASE
          WHEN ct.use_manual_override AND ct.manual_points IS NOT NULL THEN ct.manual_points
          ELSE tp.display_points
        END DESC,
        tp.wins DESC,
        tp.podiums DESC,
        tp.starts DESC
    ) AS computed_position,
    FIRST_VALUE(
      CASE
        WHEN ct.use_manual_override AND ct.manual_points IS NOT NULL THEN ct.manual_points
        ELSE tp.display_points
      END
    ) OVER (
      PARTITION BY tp.season_id
      ORDER BY
        CASE
          WHEN ct.use_manual_override AND ct.manual_points IS NOT NULL THEN ct.manual_points
          ELSE tp.display_points
        END DESC
    ) AS leader_points
  FROM team_points tp
  JOIN public.championship_teams ct ON ct.id = tp.team_id
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
  final_points AS points,
  wins,
  podiums,
  starts,
  CASE
    WHEN leader_points IS NULL THEN NULL
    WHEN final_points = leader_points THEN 0
    ELSE (leader_points - final_points)
  END::double precision AS diff_to_leader,
  use_manual_override AS is_manual_override,
  manual_points,
  manual_position,
  computed_points,
  computed_position
FROM ranked;
