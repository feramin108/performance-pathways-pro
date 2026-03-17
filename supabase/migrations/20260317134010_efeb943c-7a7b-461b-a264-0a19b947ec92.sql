-- Give hr@demo.com the HC role so the logged-in user can access the HC portal
UPDATE public.user_roles SET role = 'hc' WHERE user_id = '03d52240-be4e-4062-8d15-8063b56818ab';