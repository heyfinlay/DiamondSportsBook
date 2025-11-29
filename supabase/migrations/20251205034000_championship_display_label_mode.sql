-- Allow optional championship_result references and store display label mode directly on the results row.

ALTER TABLE public.championship_results
  ADD COLUMN IF NOT EXISTS display_label_mode text NOT NULL DEFAULT 'position';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'championship_results'
      AND column_name = 'championship_result_id'
  ) THEN
    ALTER TABLE public.championship_results
      ALTER COLUMN championship_result_id DROP NOT NULL;
  END IF;
END;
$$;
