-- Include driver status + metadata in the lineup payload
CREATE OR REPLACE FUNCTION public.get_dbgp_lineup()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'number', car_number,
      'name', driver_name,
      'team_id', team_key,
      'team_name', team_name,
      'primary_color', primary_color,
      'secondary_color', secondary_color,
      'status', status,
      'season_id', season_id,
      'driver_entry_id', driver_entry_id
    )
    ORDER BY COALESCE(car_number, 999), driver_name
  )
  INTO result
  FROM public.championship_lineup_view;

  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN undefined_table THEN
    -- View has not been created yet (fresh database); return an empty array.
    RETURN '[]'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dbgp_lineup() TO authenticated;
