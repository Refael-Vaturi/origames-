
-- 1) Announcements: add missing columns
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 2) Storage policies for announcements bucket (public read via signed/public URL; admins write)
CREATE POLICY "Announcements images are public readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcements');

CREATE POLICY "Admins upload announcement images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcements' AND public.is_admin());

CREATE POLICY "Admins update announcement images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'announcements' AND public.is_admin());

CREATE POLICY "Admins delete announcement images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'announcements' AND public.is_admin());

-- 3) Admin RPCs for Iron Dome level/credits management
CREATE OR REPLACE FUNCTION public.admin_set_iron_dome_level(p_user_id UUID, p_max_level INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.iron_dome_progress (user_id, max_level)
    VALUES (p_user_id, GREATEST(1, p_max_level))
  ON CONFLICT (user_id) DO UPDATE
    SET max_level = GREATEST(public.iron_dome_progress.max_level, EXCLUDED.max_level),
        updated_at = now();

  -- Also mirror into profiles.admin_max_level & unlocked_levels for the portal UI
  UPDATE public.profiles
    SET admin_max_level = GREATEST(COALESCE(admin_max_level, 0), p_max_level),
        unlocked_levels = (
          SELECT COALESCE(array_agg(DISTINCT lv ORDER BY lv), ARRAY[]::int[])
          FROM (
            SELECT unnest(COALESCE(unlocked_levels, ARRAY[]::int[])) AS lv
            UNION
            SELECT generate_series(1, p_max_level) AS lv
          ) s
        )
    WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_iron_dome(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.iron_dome_progress
    SET max_level = 1, stars = '{}'::jsonb, upgrades = '{}'::jsonb, best_wave = 0, updated_at = now()
    WHERE user_id = p_user_id;
  UPDATE public.profiles
    SET admin_max_level = 0, unlocked_levels = ARRAY[1]::int[], current_level = 1
    WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_player_credits(p_user_id UUID, p_credits INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.player_credits (user_id, credits)
    VALUES (p_user_id, GREATEST(0, p_credits))
  ON CONFLICT (user_id) DO UPDATE
    SET credits = GREATEST(0, EXCLUDED.credits), updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_player_credits(p_user_id UUID, p_delta INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.player_credits (user_id, credits)
    VALUES (p_user_id, GREATEST(0, p_delta))
  ON CONFLICT (user_id) DO UPDATE
    SET credits = GREATEST(0, public.player_credits.credits + p_delta), updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_room(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.rooms WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_iron_dome_level(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_iron_dome(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_player_credits(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_player_credits(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_room(UUID) TO authenticated;
