-- ============================================================================
-- MIGRATION 0014: Auto-create profile on user signup
-- ============================================================================
--
-- This migration adds a trigger to automatically create a profile when a new
-- user signs up via Supabase Auth.
--
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'spectator'
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Backfill any existing users without profiles
INSERT INTO public.profiles (id, display_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.email),
  'spectator'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
