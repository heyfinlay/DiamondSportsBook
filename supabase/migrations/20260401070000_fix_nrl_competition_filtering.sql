UPDATE public.sports_providers
SET config = jsonb_set(
  jsonb_set(
    config,
    '{sports,nrl,allowed_competition_names}',
    jsonb_build_array('NRL', 'National Rugby League', 'NRL Premiership'),
    true
  ),
  '{sports,nrl,allowed_competition_ids}',
  jsonb_build_array('sr:competition:294'),
  true
)
WHERE provider_key = 'sportradar';

DELETE FROM public.events
WHERE source_type = 'external_feed'
  AND sport_code = 'nrl';

DELETE FROM public.sports_events
WHERE sport_code = 'nrl'
  AND provider_id = (
    SELECT id
    FROM public.sports_providers
    WHERE provider_key = 'sportradar'
    LIMIT 1
  );
