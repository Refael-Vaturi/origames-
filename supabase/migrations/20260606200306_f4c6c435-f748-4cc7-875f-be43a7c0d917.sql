-- Restore EXECUTE on is_admin so RLS policies that call it work for authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.increment_profile_stat(uuid, text, integer) TO authenticated, service_role;