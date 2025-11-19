-- ============================================================================
-- MIGRATION 0019: Markets lifecycle & archiving
-- ============================================================================
-- Adds settled_at and archived flags to markets to support a clean lifecycle:
-- - settled_at records when settlement completed.
-- - archived hides markets from public boards without deleting them.
-- ============================================================================

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

