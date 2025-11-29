-- Allow optional championship_result references and store display label mode directly on the results row.

ALTER TABLE public.championship_results
  ADD COLUMN IF NOT EXISTS display_label_mode text NOT NULL DEFAULT 'position';
