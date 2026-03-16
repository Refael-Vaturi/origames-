
CREATE OR REPLACE FUNCTION public.increment_profile_stat(p_user_id uuid, p_field text, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field = 'games_played' THEN
    UPDATE profiles SET games_played = games_played + p_amount WHERE user_id = p_user_id;
  ELSIF p_field = 'fakes_caught' THEN
    UPDATE profiles SET fakes_caught = fakes_caught + p_amount WHERE user_id = p_user_id;
  ELSIF p_field = 'wins' THEN
    UPDATE profiles SET wins = wins + p_amount WHERE user_id = p_user_id;
  ELSIF p_field = 'survived' THEN
    UPDATE profiles SET survived = survived + p_amount WHERE user_id = p_user_id;
  ELSIF p_field = 'xp' THEN
    UPDATE profiles SET xp = xp + p_amount, level = GREATEST(1, (xp + p_amount) / 100 + 1) WHERE user_id = p_user_id;
  END IF;
END;
$$;
