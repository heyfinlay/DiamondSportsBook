DROP POLICY IF EXISTS "Users can update own display name" ON public.profiles;
DROP POLICY IF EXISTS profiles_user_can_update_self ON public.profiles;

CREATE POLICY profiles_user_can_update_self
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
