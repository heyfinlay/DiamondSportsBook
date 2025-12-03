-- Ensure championship_results generates UUIDs automatically and can be upserted by race/driver.

ALTER TABLE public.championship_results
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'championship_results_pkey'
      AND conrelid = 'public.championship_results'::regclass
  ) THEN
    ALTER TABLE public.championship_results
      ADD CONSTRAINT championship_results_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'championship_results_race_driver_key'
      AND conrelid = 'public.championship_results'::regclass
  ) THEN
    ALTER TABLE public.championship_results
      ADD CONSTRAINT championship_results_race_driver_key UNIQUE (race_id, driver_id);
  END IF;
END;
$$;
