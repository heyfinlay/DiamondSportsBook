-- Add username and ic_phone_number fields to profiles table
-- These fields are required for deposit/withdrawal operations

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'ic_phone_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ic_phone_number text;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.profiles.username IS
  'Display name for the user. Used in admin panels and public leaderboards.';

COMMENT ON COLUMN public.profiles.ic_phone_number IS
  'IC (in-character) phone number for contact. Required for deposit/withdrawal operations.';
