-- Create test user directly (bypasses UI signup issues)
-- Run: docker exec -i supabase_db_DiamondSportingBook psql -U postgres < scripts/create_test_user.sql

\echo '=== Creating test user ==='

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create user (confirmed_at is auto-generated from email_confirmed_at)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'finsturzaker@gmail.com',
    crypt('password123', gen_salt('bf')),
    NOW(),  -- email_confirmed_at (this will generate confirmed_at automatically)
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    false,
    false
  )
  RETURNING id INTO new_user_id;

  RAISE NOTICE 'Created user: % with ID: %', 'finsturzaker@gmail.com', new_user_id;

  -- Create profile
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (new_user_id, 'Finlay Sturzaker', 'super_admin');

  -- Add all roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (new_user_id, 'super_admin'),
    (new_user_id, 'race_control'),
    (new_user_id, 'betting_admin'),
    (new_user_id, 'marshal');

  RAISE NOTICE 'Granted all permissions';

EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'User already exists, updating permissions...';

    -- Update existing user
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE id = (SELECT id FROM auth.users WHERE email = 'finsturzaker@gmail.com');

    -- Add roles if they don't exist
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'super_admin' FROM auth.users WHERE email = 'finsturzaker@gmail.com'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'race_control' FROM auth.users WHERE email = 'finsturzaker@gmail.com'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'betting_admin' FROM auth.users WHERE email = 'finsturzaker@gmail.com'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'marshal' FROM auth.users WHERE email = 'finsturzaker@gmail.com'
    ON CONFLICT DO NOTHING;
END $$;

\echo ''
\echo '=== User Status ==='

SELECT
  u.email,
  u.id,
  CASE WHEN u.confirmed_at IS NOT NULL THEN '✓ Confirmed' ELSE '✗ Not confirmed' END as status,
  p.role as primary_role,
  array_agg(DISTINCT ur.role ORDER BY ur.role) as all_roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'finsturzaker@gmail.com'
GROUP BY u.id, u.email, u.confirmed_at, p.role;

\echo ''
\echo '✅ DONE! You can now sign in:'
\echo '   Email: finsturzaker@gmail.com'
\echo '   Password: password123'
\echo ''
\echo '   Go to: http://localhost:5173/login'
\echo ''
