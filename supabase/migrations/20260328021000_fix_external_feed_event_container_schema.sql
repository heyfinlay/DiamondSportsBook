CREATE OR REPLACE FUNCTION public.sports_upsert_event_container(p_sports_event_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sports_event_row public.sports_events;
  competition_row public.sports_competitions;
  event_row public.events;
  description_text text;
  scope_value public.market_scope_v2;
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

  SELECT * INTO competition_row
  FROM public.sports_competitions
  WHERE id = sports_event_row.competition_id;

  description_text := COALESCE(
    NULLIF(trim(concat_ws(' • ', competition_row.name, sports_event_row.round_label, sports_event_row.venue_name)), ''),
    sports_event_row.event_type
  );

  scope_value := CASE
    WHEN sports_event_row.event_type = 'qualifying' THEN 'qualifying'::public.market_scope_v2
    ELSE 'race'::public.market_scope_v2
  END;

  SELECT * INTO event_row
  FROM public.events
  WHERE sports_event_id = p_sports_event_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.events
    SET
      title = sports_event_row.title,
      description = description_text,
      starts_at = sports_event_row.scheduled_start,
      competition_id = sports_event_row.competition_id,
      market_type = COALESCE(event_row.market_type, 'WINNER_FULL_FIELD'::public.market_shape),
      scope = COALESCE(event_row.scope, scope_value),
      auto_created = true,
      external_status = sports_event_row.status::text,
      metadata = COALESCE(event_row.metadata, '{}'::jsonb) || jsonb_build_object(
        'provider_event_id', sports_event_row.provider_event_id,
        'provider_id', sports_event_row.provider_id,
        'round_label', sports_event_row.round_label,
        'event_type', sports_event_row.event_type
      )
    WHERE id = event_row.id
    RETURNING * INTO event_row;
  ELSE
    INSERT INTO public.events(
      title,
      description,
      starts_at,
      takeout,
      status,
      market_type,
      scope,
      metadata,
      source_type,
      sport_code,
      competition_id,
      sports_event_id,
      auto_created,
      external_status
    )
    VALUES (
      sports_event_row.title,
      description_text,
      sports_event_row.scheduled_start,
      0.12,
      'draft',
      'WINNER_FULL_FIELD'::public.market_shape,
      scope_value,
      jsonb_build_object(
        'provider_event_id', sports_event_row.provider_event_id,
        'provider_id', sports_event_row.provider_id,
        'round_label', sports_event_row.round_label,
        'event_type', sports_event_row.event_type
      ),
      'external_feed',
      sports_event_row.sport_code,
      sports_event_row.competition_id,
      sports_event_row.id,
      true,
      sports_event_row.status::text
    )
    RETURNING * INTO event_row;
  END IF;

  RETURN event_row;
END;
$$;
