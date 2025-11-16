-- Create Development User with Race Control Permissions
--
-- INSTRUCTIONS:
-- 1. First, sign up at http://localhost:5173/login
-- 2. Check your email at http://localhost:54324 (Inbucket)
-- 3. Click the confirmation link in the email
-- 4. Change the email below to match your signup email
-- 5. Run: docker exec -i supabase_db_DiamondSportingBook psql -U postgres < scripts/create_dev_user.sql
--

\echo '=== Granting permissions to dev user ==='

DO $$
DECLARE
  target_user_id uuid;
  target_email text := 'finsturzaker@gmail.com';  -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    -- Check if user has confirmed their email
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id AND confirmed_at IS NOT NULL) THEN
      RAISE NOTICE 'WARNING: Email not confirmed yet. Check http://localhost:54324 for confirmation email.';
    END IF;

    -- Ensure profile exists (should be auto-created, but just in case)
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (target_user_id, 'Dev User', 'super_admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin';

    -- Add race_control to user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'race_control')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Add super_admin to user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Add betting_admin to user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'betting_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Add marshal to user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'marshal')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Successfully granted all permissions to: % (%)', target_email, target_user_id;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'ERROR: User not found with email: %', target_email;
    RAISE NOTICE '';
    RAISE NOTICE 'Please:';
    RAISE NOTICE '1. Sign up at http://localhost:5173/login';
    RAISE NOTICE '2. Check http://localhost:54324 for confirmation email';
    RAISE NOTICE '3. Click confirmation link';
    RAISE NOTICE '4. Run this script again';
    RAISE NOTICE '';
  END IF;
END $$;

\echo ''
\echo '=== User Status ==='

-- Show the user's profile and roles
SELECT
  u.email,
  u.id as user_id,
  CASE
    WHEN u.confirmed_at IS NOT NULL THEN '✓ Confirmed'
    ELSE '✗ Not Confirmed'
  END as email_status,
  p.role as primary_role,
  array_agg(DISTINCT ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL) as additional_roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'finsturzaker@gmail.com'  -- CHANGE THIS TO YOUR EMAIL
GROUP BY u.id, u.email, u.confirmed_at, p.role;

\echo ''
\echo 'If you see your email above with roles, you are ready to go!'
\echo 'Refresh your browser and navigate to /control or /admin'
\echo ''
