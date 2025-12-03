-- ============================================================================
-- Market Builder Example Seeds
-- These examples assume a timing session with a name like "Race 2" exists.
-- They are safe to run repeatedly and will no-op if the Race 2 session
-- cannot be found.
-- ============================================================================

-- Helper: pick a Race 2 session
WITH race_session AS (
  SELECT id
  FROM public.timing_sessions
  WHERE lower(name) LIKE 'race 2%'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 'No Race 2 session found; seeds skipped' AS notice
WHERE NOT EXISTS (SELECT 1 FROM race_session);

-- ---------------------------------------------------------------------------
-- Race 2 Overall Winner (auto-seeded drivers)
-- ---------------------------------------------------------------------------
SELECT public.market_builder_create(
  (SELECT id FROM race_session),
  'Race 2 Overall Winner',
  'WINNER_FULL_FIELD',
  'race',
  'Full-field pool using the Race 2 driver list.',
  0.12,
  NULL,
  jsonb_build_object('category', 'Race 2', 'visible_on_landing', true),
  '[
    {
      "name": "Overall Winner",
      "label": "Race 2 Winner",
      "pool_type": "default",
      "config": { "builder_key": "race2-winner" }
    }
  ]'::jsonb
)
WHERE EXISTS (SELECT 1 FROM race_session);

-- ---------------------------------------------------------------------------
-- Race 2 Head-to-Head (three matchups built from the first six drivers)
-- ---------------------------------------------------------------------------
WITH race_session AS (
  SELECT id FROM race_session
),
drivers AS (
  SELECT id, name, row_number() OVER (ORDER BY number NULLS LAST, name) AS rn
  FROM public.timing_drivers
  WHERE session_id = (SELECT id FROM race_session)
  LIMIT 6
),
pairs AS (
  SELECT
    (SELECT id FROM drivers WHERE rn = 1) AS a1,
    (SELECT name FROM drivers WHERE rn = 1) AS a1_name,
    (SELECT id FROM drivers WHERE rn = 2) AS b1,
    (SELECT name FROM drivers WHERE rn = 2) AS b1_name,
    (SELECT id FROM drivers WHERE rn = 3) AS a2,
    (SELECT name FROM drivers WHERE rn = 3) AS a2_name,
    (SELECT id FROM drivers WHERE rn = 4) AS b2,
    (SELECT name FROM drivers WHERE rn = 4) AS b2_name,
    (SELECT id FROM drivers WHERE rn = 5) AS a3,
    (SELECT name FROM drivers WHERE rn = 5) AS a3_name,
    (SELECT id FROM drivers WHERE rn = 6) AS b3,
    (SELECT name FROM drivers WHERE rn = 6) AS b3_name
)
SELECT public.market_builder_create(
  (SELECT id FROM race_session),
  'Race 2 Head-to-Head',
  'HEAD_TO_HEAD',
  'race',
  'Three quick H2H matchups seeded from timing drivers.',
  0.12,
  NULL,
  jsonb_build_object('category', 'Race 2', 'visible_on_landing', true),
  jsonb_build_array(
    jsonb_build_object(
      'name', format('%s vs %s', (SELECT a1_name FROM pairs), (SELECT b1_name FROM pairs)),
      'label', format('%s vs %s', (SELECT a1_name FROM pairs), (SELECT b1_name FROM pairs)),
      'pool_type', 'h2h',
      'config', jsonb_build_object('builder_key', 'h2h-1'),
      'runners', jsonb_build_array(
        jsonb_build_object('label', (SELECT a1_name FROM pairs), 'participant_type', 'driver', 'participant_id', (SELECT a1 FROM pairs)),
        jsonb_build_object('label', (SELECT b1_name FROM pairs), 'participant_type', 'driver', 'participant_id', (SELECT b1 FROM pairs))
      )
    ),
    jsonb_build_object(
      'name', format('%s vs %s', (SELECT a2_name FROM pairs), (SELECT b2_name FROM pairs)),
      'label', format('%s vs %s', (SELECT a2_name FROM pairs), (SELECT b2_name FROM pairs)),
      'pool_type', 'h2h',
      'config', jsonb_build_object('builder_key', 'h2h-2'),
      'runners', jsonb_build_array(
        jsonb_build_object('label', (SELECT a2_name FROM pairs), 'participant_type', 'driver', 'participant_id', (SELECT a2 FROM pairs)),
        jsonb_build_object('label', (SELECT b2_name FROM pairs), 'participant_type', 'driver', 'participant_id', (SELECT b2 FROM pairs))
      )
    ),
    jsonb_build_object(
      'name', format('%s vs %s', (SELECT a3_name FROM pairs), (SELECT b3_name FROM pairs)),
      'label', format('%s vs %s', (SELECT a3_name FROM pairs), (SELECT b3_name FROM pairs)),
      'pool_type', 'h2h',
      'config', jsonb_build_object('builder_key', 'h2h-3'),
      'runners', jsonb_build_array(
        jsonb_build_object('label', (SELECT a3_name FROM pairs), 'participant_type', 'driver', 'participant_id', (SELECT a3 FROM pairs)),
        jsonb_build_object('label', (SELECT b3_name FROM pairs), 'participant_type', 'driver', 'participant_id', (SELECT b3 FROM pairs))
      )
    )
  )
)
WHERE EXISTS (SELECT 1 FROM race_session) AND EXISTS (SELECT 1 FROM drivers);

-- ---------------------------------------------------------------------------
-- Race 2 Lap 1 Incident (Yes/No)
-- ---------------------------------------------------------------------------
SELECT public.market_builder_create(
  (SELECT id FROM race_session),
  'Race 2 Lap 1 Incident',
  'YES_NO_PROP',
  'race',
  'Binary prop on a Lap 1 incident.',
  0.12,
  NULL,
  jsonb_build_object('category', 'Race 2', 'visible_on_landing', true),
  '[
    {
      "name": "Lap 1 Incident",
      "label": "Lap 1 Incident",
      "pool_type": "yes_no",
      "config": { "proposition": "Will there be a Lap 1 incident?", "builder_key": "lap1-incident" },
      "runners": [
        { "label": "Yes", "participant_type": "boolean", "metadata": { "value": true } },
        { "label": "No", "participant_type": "boolean", "metadata": { "value": false } }
      ]
    }
  ]'::jsonb
)
WHERE EXISTS (SELECT 1 FROM race_session);

-- ---------------------------------------------------------------------------
-- Race 2 Safety Car Count (Numeric Range)
-- ---------------------------------------------------------------------------
SELECT public.market_builder_create(
  (SELECT id FROM race_session),
  'Race 2 Safety Car Count',
  'NUMERIC_RANGE',
  'race',
  'Range bands for total safety cars.',
  0.12,
  NULL,
  jsonb_build_object('category', 'Race 2', 'visible_on_landing', true, 'market_type_config', jsonb_build_object('unit', 'integer')),
  '[
    {
      "name": "Safety Car Count",
      "label": "Safety Car Count",
      "pool_type": "range",
      "config": { "metric_label": "Safety Cars", "unit": "integer", "builder_key": "sc-range" },
      "runners": [
        { "label": "0", "participant_type": "custom", "range_start": 0, "range_end": 0 },
        { "label": "1", "participant_type": "custom", "range_start": 1, "range_end": 1 },
        { "label": "2+", "participant_type": "custom", "range_start": 2, "range_end": null }
      ]
    }
  ]'::jsonb
)
WHERE EXISTS (SELECT 1 FROM race_session);
