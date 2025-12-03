-- Defensive trigger to ensure championship_results.id is always populated.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_championship_results_id_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_championship_results_set_id ON public.championship_results;

CREATE TRIGGER trg_championship_results_set_id
BEFORE INSERT ON public.championship_results
FOR EACH ROW
EXECUTE FUNCTION public.set_championship_results_id_default();
