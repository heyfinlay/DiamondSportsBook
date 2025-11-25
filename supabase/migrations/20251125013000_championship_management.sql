-- ============================================================================
-- CHAMPIONSHIP MANAGEMENT TABLES & VIEWS
-- ============================================================================

-- Generic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Seasons -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer,
  status text NOT NULL DEFAULT 'active',
  current_round integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TRIGGER trg_championship_seasons_updated_at
BEFORE UPDATE ON public.championship_seasons
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons are readable by everyone"
  ON public.championship_seasons
  FOR SELECT
  USING (true);

CREATE POLICY "Seasons managed by admins"
  ON public.championship_seasons
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

-- Teams ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.championship_seasons(id) ON DELETE CASCADE,
  legacy_team_id text,
  name text NOT NULL,
  short_code text,
  primary_color text,
  secondary_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, name),
  UNIQUE (season_id, legacy_team_id)
);

CREATE TRIGGER trg_championship_teams_updated_at
BEFORE UPDATE ON public.championship_teams
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Championship teams are readable"
  ON public.championship_teams
  FOR SELECT
  USING (true);

CREATE POLICY "Championship teams managed by admins"
  ON public.championship_teams
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

-- Drivers --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.championship_seasons(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.championship_teams(id) ON DELETE SET NULL,
  driver_name text NOT NULL,
  car_number integer,
  status text NOT NULL DEFAULT 'primary' CHECK (
    status IN ('primary', 'reserve', 'inactive')
  ),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, driver_name)
);

CREATE TRIGGER trg_championship_drivers_updated_at
BEFORE UPDATE ON public.championship_drivers
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Championship drivers readable"
  ON public.championship_drivers
  FOR SELECT
  USING (true);

CREATE POLICY "Championship drivers managed by admins"
  ON public.championship_drivers
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

-- Races ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.championship_seasons(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  race_name text NOT NULL,
  circuit_name text,
  race_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, round_number)
);

CREATE TRIGGER trg_championship_races_updated_at
BEFORE UPDATE ON public.championship_races
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Championship races readable"
  ON public.championship_races
  FOR SELECT
  USING (true);

CREATE POLICY "Championship races managed by admins"
  ON public.championship_races
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

-- Results --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.championship_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.championship_races(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.championship_drivers(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.championship_teams(id) ON DELETE SET NULL,
  finish_position integer,
  position_display text,
  grid_position integer,
  status text,
  gap_to_leader text,
  points_awarded numeric(8,2) NOT NULL DEFAULT 0,
  fastest_lap boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, driver_id)
);

CREATE TRIGGER trg_championship_results_updated_at
BEFORE UPDATE ON public.championship_results
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.championship_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Championship results readable"
  ON public.championship_results
  FOR SELECT
  USING (true);

CREATE POLICY "Championship results managed by admins"
  ON public.championship_results
  FOR ALL
  USING (
    public.has_permission('betting_admin')
    OR public.has_permission('race_control')
    OR public.has_permission('super_admin')
  );

-- ============================================================================
-- SEED DEFAULT SEASON & TEAMS FROM EXISTING TEAMS TABLE
-- ============================================================================
DO $$
DECLARE
  season_id uuid;
BEGIN
  SELECT id INTO season_id
  FROM public.championship_seasons
  WHERE name = 'DBGP 2024 Season'
  LIMIT 1;

  IF season_id IS NULL THEN
    INSERT INTO public.championship_seasons (name, year, status, current_round)
    VALUES ('DBGP 2024 Season', 2024, 'active', 1)
    RETURNING id INTO season_id;
  END IF;

  INSERT INTO public.championship_teams (season_id, legacy_team_id, name, short_code, primary_color, secondary_color)
  SELECT season_id, team_id, name, abbrev, primary_hex, secondary_hex
  FROM public.teams
  ON CONFLICT (season_id, legacy_team_id) DO UPDATE
    SET name = EXCLUDED.name,
        short_code = EXCLUDED.short_code,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        updated_at = now();
END;
$$;

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.driver_standings_view AS
WITH driver_points AS (
  SELECT
    d.id AS driver_id,
    d.driver_name,
    d.season_id,
    d.team_id,
    ct.name AS team_name,
    COALESCE(ct.primary_color, '#FFFFFF') AS team_color,
    COALESCE(SUM(r.points_awarded), 0)::double precision AS points,
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
ranked AS (
  SELECT
    dp.*,
    RANK() OVER (PARTITION BY season_id ORDER BY points DESC, wins DESC, podiums DESC, starts DESC) AS position,
    FIRST_VALUE(points) OVER (PARTITION BY season_id ORDER BY points DESC) AS leader_points
  FROM driver_points dp
)
SELECT
  driver_id,
  driver_name,
  team_id,
  team_name,
  team_color,
  season_id,
  position,
  points,
  wins,
  podiums,
  starts,
  dnf_count,
  poles,
  CASE
    WHEN leader_points IS NULL THEN NULL
    WHEN position = 1 THEN 0
    ELSE (leader_points - points)
  END::double precision AS diff_to_leader
FROM ranked;

CREATE OR REPLACE VIEW public.team_standings_view AS
WITH team_points AS (
  SELECT
    ct.id AS team_id,
    ct.name AS team_name,
    COALESCE(ct.primary_color, '#FFFFFF') AS team_color,
    ct.season_id,
    COALESCE(SUM(r.points_awarded), 0)::double precision AS points,
    COUNT(r.*) AS starts,
    COUNT(*) FILTER (WHERE r.finish_position = 1) AS wins,
    COUNT(*) FILTER (WHERE r.finish_position BETWEEN 1 AND 3) AS podiums
  FROM public.championship_teams ct
  LEFT JOIN public.championship_results r ON r.team_id = ct.id
  GROUP BY ct.id, ct.name, ct.primary_color, ct.season_id
),
ranked AS (
  SELECT
    tp.*,
    RANK() OVER (PARTITION BY season_id ORDER BY points DESC, wins DESC, podiums DESC, starts DESC) AS position,
    FIRST_VALUE(points) OVER (PARTITION BY season_id ORDER BY points DESC) AS leader_points
  FROM team_points tp
)
SELECT
  team_id,
  team_name,
  team_color,
  season_id,
  position,
  points,
  wins,
  podiums,
  starts,
  CASE
    WHEN leader_points IS NULL THEN NULL
    WHEN position = 1 THEN 0
    ELSE (leader_points - points)
  END::double precision AS diff_to_leader
FROM ranked;

CREATE OR REPLACE VIEW public.race_results_view AS
SELECT
  r.id AS result_id,
  races.id AS session_id,
  races.season_id,
  races.round_number,
  races.race_name,
  races.circuit_name,
  races.race_date,
  r.driver_id,
  d.driver_name,
  d.car_number,
  COALESCE(r.team_id, d.team_id) AS team_id,
  ct.name AS team_name,
  COALESCE(ct.primary_color, '#FFFFFF') AS team_color,
  COALESCE(r.position_display, r.finish_position::text, '—') AS position_display,
  r.finish_position,
  r.grid_position,
  COALESCE(r.gap_to_leader, CASE WHEN r.finish_position = 1 THEN '—' ELSE NULL END) AS gap_to_leader,
  r.status,
  r.points_awarded::double precision AS points_awarded,
  r.fastest_lap,
  r.updated_at,
  r.created_at
FROM public.championship_results r
JOIN public.championship_races races ON races.id = r.race_id
JOIN public.championship_drivers d ON d.id = r.driver_id
LEFT JOIN public.championship_teams ct ON ct.id = COALESCE(r.team_id, d.team_id);

CREATE OR REPLACE VIEW public.championship_lineup_view AS
SELECT
  d.id AS driver_entry_id,
  d.driver_name,
  d.car_number,
  d.status,
  d.season_id,
  COALESCE(ct.legacy_team_id, ct.id::text) AS team_key,
  ct.name AS team_name,
  COALESCE(ct.primary_color, '#FFFFFF') AS primary_color,
  COALESCE(ct.secondary_color, '#111111') AS secondary_color
FROM public.championship_drivers d
JOIN public.championship_seasons s ON s.id = d.season_id
LEFT JOIN public.championship_teams ct ON ct.id = d.team_id
WHERE s.status = 'active'
  AND COALESCE(d.status, 'primary') <> 'inactive'
ORDER BY COALESCE(d.car_number, 1000), d.driver_name;

-- ============================================================================
-- UPDATE DBGP LINEUP RPC TO USE NEW VIEW
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_dbgp_lineup()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'number', car_number,
      'name', driver_name,
      'team_id', team_key,
      'team_name', team_name,
      'primary_color', primary_color,
      'secondary_color', secondary_color
    )
    ORDER BY COALESCE(car_number, 999), driver_name
  )
  FROM public.championship_lineup_view;
$$;

GRANT EXECUTE ON FUNCTION public.get_dbgp_lineup TO authenticated;
