-- Add IC number column to profiles for character onboarding

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'ic_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ic_number text;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.ic_number IS
  'Canonical in-character identification number required to complete profile onboarding.';
