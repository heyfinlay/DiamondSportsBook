-- ============================================================================
-- SPORTS FEED FOUNDATIONS
-- External sports data model for Formula 1, NRL, AFL, MMA, and Soccer.
-- This sits beside the legacy timing domain and powers auto-managed markets.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sports_event_status') THEN
    CREATE TYPE public.sports_event_status AS ENUM (
      'scheduled',
      'live',
      'paused',
      'completed',
      'official',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sports_sync_job_type') THEN
    CREATE TYPE public.sports_sync_job_type AS ENUM (
      'metadata',
      'schedule',
      'live',
      'detail',
      'settlement',
      'reconciliation'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sports_sync_status') THEN
    CREATE TYPE public.sports_sync_status AS ENUM (
      'queued',
      'running',
      'completed',
      'failed',
      'partial',
      'rate_limited'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sports_result_status') THEN
    CREATE TYPE public.sports_result_status AS ENUM (
      'provisional',
      'official',
      'void',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_source_type') THEN
    CREATE TYPE public.market_source_type AS ENUM (
      'manual_timing',
      'external_feed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sports_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  quota_limit integer,
  quota_window text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.sports_providers(id) ON DELETE CASCADE,
  sport_code text NOT NULL CHECK (sport_code IN ('f1', 'nrl', 'afl', 'mma', 'soccer')),
  provider_competition_id text NOT NULL,
  name text NOT NULL,
  short_name text,
  country_code text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, provider_competition_id)
);

CREATE TABLE IF NOT EXISTS public.sports_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.sports_competitions(id) ON DELETE CASCADE,
  provider_season_id text,
  name text NOT NULL,
  year integer,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, name)
);

CREATE TABLE IF NOT EXISTS public.sports_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES public.sports_competitions(id) ON DELETE SET NULL,
  sport_code text NOT NULL CHECK (sport_code IN ('f1', 'nrl', 'afl', 'mma', 'soccer')),
  participant_type text NOT NULL CHECK (participant_type IN ('driver', 'team', 'fighter', 'club', 'custom')),
  provider_participant_id text,
  display_name text NOT NULL,
  short_name text,
  abbreviation text,
  image_url text,
  primary_color text,
  secondary_color text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (sport_code, provider_participant_id)
);

CREATE TABLE IF NOT EXISTS public.sports_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.sports_providers(id) ON DELETE CASCADE,
  competition_id uuid REFERENCES public.sports_competitions(id) ON DELETE SET NULL,
  season_id uuid REFERENCES public.sports_seasons(id) ON DELETE SET NULL,
  sport_code text NOT NULL CHECK (sport_code IN ('f1', 'nrl', 'afl', 'mma', 'soccer')),
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  slug text,
  scheduled_start timestamptz,
  status public.sports_event_status NOT NULL DEFAULT 'scheduled',
  venue_name text,
  round_label text,
  live_clock text,
  live_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  completed_at timestamptz,
  official_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.sports_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sports_events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.sports_participants(id) ON DELETE CASCADE,
  side text,
  slot integer,
  role text,
  score numeric(14,2),
  live_rank integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_id)
);

CREATE TABLE IF NOT EXISTS public.sports_event_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sports_events(id) ON DELETE CASCADE,
  snapshot_kind text NOT NULL DEFAULT 'detail',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports_event_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sports_events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.sports_participants(id) ON DELETE CASCADE,
  result_status public.sports_result_status NOT NULL DEFAULT 'provisional',
  result_position integer,
  result_code text,
  outcome_text text,
  score_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_id)
);

CREATE TABLE IF NOT EXISTS public.sports_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.sports_providers(id) ON DELETE CASCADE,
  sport_code text CHECK (sport_code IN ('f1', 'nrl', 'afl', 'mma', 'soccer')),
  job_type public.sports_sync_job_type NOT NULL,
  status public.sports_sync_status NOT NULL DEFAULT 'queued',
  request_count integer NOT NULL DEFAULT 0,
  records_written integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error_message text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.sports_market_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_code text NOT NULL CHECK (sport_code IN ('f1', 'nrl', 'afl', 'mma', 'soccer')),
  market_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  auto_open_offset_minutes integer NOT NULL DEFAULT 180,
  auto_close_mode text NOT NULL DEFAULT 'event_start',
  settlement_mode text NOT NULL DEFAULT 'official_result',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports_market_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sports_event_id uuid NOT NULL REFERENCES public.sports_events(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.sports_market_templates(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'generated',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sports_event_id, template_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_providers_updated_at ON public.sports_providers';
    EXECUTE 'CREATE TRIGGER trg_sports_providers_updated_at BEFORE UPDATE ON public.sports_providers FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_competitions_updated_at ON public.sports_competitions';
    EXECUTE 'CREATE TRIGGER trg_sports_competitions_updated_at BEFORE UPDATE ON public.sports_competitions FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_seasons_updated_at ON public.sports_seasons';
    EXECUTE 'CREATE TRIGGER trg_sports_seasons_updated_at BEFORE UPDATE ON public.sports_seasons FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_participants_updated_at ON public.sports_participants';
    EXECUTE 'CREATE TRIGGER trg_sports_participants_updated_at BEFORE UPDATE ON public.sports_participants FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_events_updated_at ON public.sports_events';
    EXECUTE 'CREATE TRIGGER trg_sports_events_updated_at BEFORE UPDATE ON public.sports_events FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_event_participants_updated_at ON public.sports_event_participants';
    EXECUTE 'CREATE TRIGGER trg_sports_event_participants_updated_at BEFORE UPDATE ON public.sports_event_participants FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_event_results_updated_at ON public.sports_event_results';
    EXECUTE 'CREATE TRIGGER trg_sports_event_results_updated_at BEFORE UPDATE ON public.sports_event_results FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_market_templates_updated_at ON public.sports_market_templates';
    EXECUTE 'CREATE TRIGGER trg_sports_market_templates_updated_at BEFORE UPDATE ON public.sports_market_templates FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sports_market_generation_runs_updated_at ON public.sports_market_generation_runs';
    EXECUTE 'CREATE TRIGGER trg_sports_market_generation_runs_updated_at BEFORE UPDATE ON public.sports_market_generation_runs FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at()';
  END IF;
END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source_type public.market_source_type NOT NULL DEFAULT 'manual_timing',
  ADD COLUMN IF NOT EXISTS sport_code text,
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.sports_competitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sports_event_id uuid REFERENCES public.sports_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS market_template_key text,
  ADD COLUMN IF NOT EXISTS external_status text;

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS auto_managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trading_status_reason text,
  ADD COLUMN IF NOT EXISTS bet_delay_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspend_on_live_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS result_derivation jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.outcomes
  ADD COLUMN IF NOT EXISTS participant_type text,
  ADD COLUMN IF NOT EXISTS participant_id text,
  ADD COLUMN IF NOT EXISTS sports_participant_id uuid REFERENCES public.sports_participants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS result_key text,
  ADD COLUMN IF NOT EXISTS display_order integer;

CREATE INDEX IF NOT EXISTS sports_competitions_sport_code_idx ON public.sports_competitions(sport_code);
CREATE INDEX IF NOT EXISTS sports_participants_sport_code_idx ON public.sports_participants(sport_code);
CREATE INDEX IF NOT EXISTS sports_events_sport_code_idx ON public.sports_events(sport_code);
CREATE INDEX IF NOT EXISTS sports_events_status_idx ON public.sports_events(status);
CREATE INDEX IF NOT EXISTS sports_events_scheduled_start_idx ON public.sports_events(scheduled_start);
CREATE INDEX IF NOT EXISTS sports_events_last_synced_idx ON public.sports_events(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS sports_event_participants_event_idx ON public.sports_event_participants(event_id);
CREATE INDEX IF NOT EXISTS sports_event_results_event_idx ON public.sports_event_results(event_id);
CREATE INDEX IF NOT EXISTS sports_event_snapshots_event_idx ON public.sports_event_snapshots(event_id, ingested_at DESC);
CREATE INDEX IF NOT EXISTS sports_sync_runs_provider_idx ON public.sports_sync_runs(provider_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sports_sync_runs_status_idx ON public.sports_sync_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS sports_market_generation_runs_event_idx ON public.sports_market_generation_runs(sports_event_id);
CREATE INDEX IF NOT EXISTS events_source_type_idx ON public.events(source_type);
CREATE INDEX IF NOT EXISTS events_sports_event_idx ON public.events(sports_event_id);
CREATE INDEX IF NOT EXISTS events_sport_code_idx ON public.events(sport_code);
CREATE INDEX IF NOT EXISTS markets_auto_managed_idx ON public.markets(auto_managed);
CREATE INDEX IF NOT EXISTS outcomes_sports_participant_idx ON public.outcomes(sports_participant_id);

ALTER TABLE public.sports_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_event_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_market_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_market_generation_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Sports competitions are readable"
    ON public.sports_competitions
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports seasons are readable"
    ON public.sports_seasons
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports participants are readable"
    ON public.sports_participants
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports events are readable"
    ON public.sports_events
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports event participants are readable"
    ON public.sports_event_participants
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports event results are readable"
    ON public.sports_event_results
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports providers managed by admins"
    ON public.sports_providers
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports competitions managed by admins"
    ON public.sports_competitions
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports seasons managed by admins"
    ON public.sports_seasons
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports participants managed by admins"
    ON public.sports_participants
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports events managed by admins"
    ON public.sports_events
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports event participants managed by admins"
    ON public.sports_event_participants
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports event results managed by admins"
    ON public.sports_event_results
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports event snapshots managed by admins"
    ON public.sports_event_snapshots
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports sync runs managed by admins"
    ON public.sports_sync_runs
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports market templates managed by admins"
    ON public.sports_market_templates
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Sports market generation runs managed by admins"
    ON public.sports_market_generation_runs
    FOR ALL
    USING (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    )
    WITH CHECK (
      public.has_permission('sportsbook_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
      OR public.has_permission('super_admin')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE VIEW public.sports_provider_health AS
SELECT
  p.id AS provider_id,
  p.provider_key,
  p.display_name,
  p.enabled,
  p.quota_limit,
  p.quota_window,
  run_row.sport_code,
  run_row.job_type,
  run_row.status,
  run_row.request_count,
  run_row.records_written,
  run_row.started_at,
  run_row.finished_at,
  run_row.error_message,
  run_row.context
FROM public.sports_providers p
LEFT JOIN LATERAL (
  SELECT
    sr.sport_code,
    sr.job_type,
    sr.status,
    sr.request_count,
    sr.records_written,
    sr.started_at,
    sr.finished_at,
    sr.error_message,
    sr.context
  FROM public.sports_sync_runs sr
  WHERE sr.provider_id = p.id
  ORDER BY sr.started_at DESC
  LIMIT 1
) run_row ON true;

INSERT INTO public.sports_providers (
  provider_key,
  display_name,
  enabled,
  quota_limit,
  quota_window,
  config
)
VALUES (
  'sportradar',
  'Sportradar',
  true,
  1000,
  '30d trial',
  jsonb_build_object(
    'note',
    'Use server-side sync jobs only. Do not expose API keys in the client.',
    'sports',
    jsonb_build_array('f1', 'nrl', 'afl', 'mma', 'soccer')
  )
)
ON CONFLICT (provider_key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  enabled = EXCLUDED.enabled,
  quota_limit = EXCLUDED.quota_limit,
  quota_window = EXCLUDED.quota_window,
  config = EXCLUDED.config,
  updated_at = now();

INSERT INTO public.sports_market_templates (
  sport_code,
  market_key,
  event_type,
  display_name,
  auto_open_offset_minutes,
  auto_close_mode,
  settlement_mode,
  config
)
VALUES
  ('f1', 'f1_race_winner', 'race', 'Race Winner', 240, 'event_start', 'official_result', jsonb_build_object('pool_type', 'winner')),
  ('f1', 'f1_podium_finish', 'race', 'Top 3 Finish', 240, 'event_start', 'official_result', jsonb_build_object('pool_type', 'default', 'min_finish_position', 1, 'max_finish_position', 3)),
  ('nrl', 'nrl_match_winner', 'match', 'Match Winner', 120, 'event_start', 'official_result', jsonb_build_object('pool_type', 'winner')),
  ('afl', 'afl_match_winner', 'match', 'Match Winner', 120, 'event_start', 'official_result', jsonb_build_object('pool_type', 'winner')),
  ('mma', 'mma_fight_winner', 'fight', 'Fight Winner', 60, 'event_start', 'official_result', jsonb_build_object('pool_type', 'winner')),
  ('soccer', 'soccer_match_winner', 'match', 'Match Winner', 120, 'event_start', 'official_result', jsonb_build_object('pool_type', 'winner'))
ON CONFLICT (market_key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  auto_open_offset_minutes = EXCLUDED.auto_open_offset_minutes,
  auto_close_mode = EXCLUDED.auto_close_mode,
  settlement_mode = EXCLUDED.settlement_mode,
  config = EXCLUDED.config,
  updated_at = now();
