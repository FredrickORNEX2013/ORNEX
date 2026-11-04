/*
# Create admin account for Fredrick2013@proton.me

1. Purpose
- Creates a Supabase auth user with email Fredrick2013@proton.me and password Ornex12345
- Adds the user to the admins table with role 'owner'
- Email confirmation is set to true so login works immediately

2. Changes
- New row in auth.users with encrypted_password (bcrypt), email_confirmed_at = now()
- New row in public.admins with email + role 'owner'
*/

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'Fredrick2013@proton.me',
  crypt('Ornex12345', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  ''
);

INSERT INTO public.admins (email, role)
VALUES ('Fredrick2013@proton.me', 'owner')
ON CONFLICT (email) DO NOTHING;
