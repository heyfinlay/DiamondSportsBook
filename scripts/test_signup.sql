-- Test signup directly in the database
-- This bypasses the UI to test if the issue is frontend or backend

\echo '=== Creating test user directly ==='

-- Create user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'finsturzaker@gmail.com',
  crypt('password123', gen_salt('bf')),  -- Password: password123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

\echo ''
\echo '=== Checking if user was created ==='

SELECT id, email, email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email = 'finsturzaker@gmail.com';

\echo ''
\echo '=== Creating profile for user ==='

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'Finlay Sturzaker', 'super_admin'::public.user_role
FROM auth.users
WHERE email = 'finsturzaker@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin'::public.user_role;

\echo ''
\echo '=== Adding roles ==='

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'finsturzaker@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'race_control'
FROM auth.users
WHERE email = 'finsturzaker@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'betting_admin'
FROM auth.users
WHERE email = 'finsturzaker@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'marshal'
FROM auth.users
WHERE email = 'finsturzaker@gmail.com'
ON CONFLICT DO NOTHING;

\echo ''
\echo '=== Final user status ==='

SELECT
  u.email,
  u.id,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.role as primary_role,
  array_agg(DISTINCT ur.role ORDER BY ur.role) as all_roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'finsturzaker@gmail.com'
GROUP BY u.id, u.email, u.email_confirmed_at, p.role;

\echo ''
\echo '=== DONE ==='
\echo 'You can now sign in with:'
\echo '  Email: finsturzaker@gmail.com'
\echo '  Password: password123'
\echo ''
