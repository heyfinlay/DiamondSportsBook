-- Create Development User with Race Control Permissions
-- This script creates a test user for local development
-- Run this after signing up via the UI to grant permissions

-- Option 1: Grant race_control to an existing user by email
-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'admin@example.com'  -- CHANGE THIS TO YOUR EMAIL
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    -- Insert race_control role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'race_control')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Also add super_admin for full access
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Granted permissions to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User not found. Please sign up first via the UI.';
  END IF;
END $$;

-- Verify the user now has permissions
SELECT
  u.email,
  u.id as user_id,
  array_agg(ur.role) as roles
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@example.com'  -- CHANGE THIS TO YOUR EMAIL
GROUP BY u.id, u.email;
