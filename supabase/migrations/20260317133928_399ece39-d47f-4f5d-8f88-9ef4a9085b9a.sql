-- Insert missing profiles for existing auth users
INSERT INTO public.profiles (id, full_name, email, username)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Insert missing user_roles for existing auth users (default to employee)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'employee'
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.id IS NULL;