-- ============================================================================
-- Allow admins to read all profiles for pending deposit visibility
-- ============================================================================

DO $$
BEGIN
  CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      public.has_permission('super_admin')
      OR public.has_permission('betting_admin')
      OR public.has_permission('race_control')
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
