
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  user_id,
  display_name,
  username,
  avatar_url,
  level,
  country
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
