-- Allow HC to update employee profiles for manager/department assignment and directory administration
DROP POLICY IF EXISTS "profiles_update_hc" ON public.profiles;

CREATE POLICY "profiles_update_hc"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((public.get_my_role())::text = 'hc'::text)
WITH CHECK ((public.get_my_role())::text = 'hc'::text);