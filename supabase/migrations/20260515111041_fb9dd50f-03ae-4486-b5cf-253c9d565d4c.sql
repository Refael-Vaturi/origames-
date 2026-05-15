
-- Add admin-related columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS money INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unlocked_levels INTEGER[] NOT NULL DEFAULT ARRAY[1],
  ADD COLUMN IF NOT EXISTS admin_max_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- is_admin() helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN ('orivaturi22@gmail.com', 'batatakara@gmail.com'),
    false
  );
$$;

-- Admin policies for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin actions log
CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_username TEXT,
  amount INTEGER,
  level_number INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs"
ON public.admin_actions_log FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert logs"
ON public.admin_actions_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND admin_email = (auth.jwt() ->> 'email'));

CREATE INDEX IF NOT EXISTS idx_admin_actions_log_created ON public.admin_actions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin ON public.admin_actions_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_action ON public.admin_actions_log(action_type);

-- Update handle_new_user to populate email + ensure unique username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  candidate_username TEXT;
  attempt INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'player'
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF length(base_username) = 0 THEN base_username := 'player'; END IF;

  candidate_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate_username) AND attempt < 10 LOOP
    attempt := attempt + 1;
    candidate_username := base_username || floor(random() * 10000)::int::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, display_name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Player'),
    NEW.email,
    candidate_username
  )
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill emails for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email = '');

-- Backfill usernames where missing
UPDATE public.profiles
SET username = COALESCE(username, regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '', 'g') || floor(random() * 10000)::int::text)
WHERE username IS NULL OR username = '';
