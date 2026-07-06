
-- 1) Idempotency ledger for Stripe checkout sessions, used by the
--    confirm-credits edge function so a given payment can only ever be
--    credited once (service_role only; clients never touch this directly).
CREATE TABLE IF NOT EXISTS public.stripe_processed_sessions (
  session_id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  credits INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_processed_sessions ENABLE ROW LEVEL SECURITY;
-- No policies granted to anon/authenticated: only service_role (which
-- bypasses RLS) can read or write this table.

-- 2) profiles: stop exposing every authenticated user's full row (including
--    email, money, hearts, unlocked_levels) to every other authenticated
--    user. Each user can now only SELECT their own full row; admins keep
--    full access via the existing is_admin() policy.
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- A safe, non-sensitive view for the legitimate cases where the app needs
-- to show OTHER users' data (friends list, room player names, leaderboards,
-- username-availability checks). Runs with the view owner's privileges
-- (Postgres default for views), so it can read across all rows even though
-- the base table now restricts SELECT to the owning user.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, user_id, display_name, username, avatar_url, level, xp, wins,
       games_played, fakes_caught, survived, current_level, last_seen
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 3) Sanity bounds on user-submitted leaderboard scores. This is a coarse
--    server-side backstop (reject obviously-impossible values), not a full
--    anti-cheat simulation.
CREATE OR REPLACE FUNCTION public.validate_iron_dome_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.score < 0 OR NEW.score > 5000000 THEN
    RAISE EXCEPTION 'Score out of allowed range';
  END IF;
  IF NEW.wave < 1 OR NEW.wave > 1000 THEN
    RAISE EXCEPTION 'Wave out of allowed range';
  END IF;
  IF NEW.max_combo < 0 OR NEW.max_combo > 10000 THEN
    RAISE EXCEPTION 'Combo out of allowed range';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_iron_dome_score_trigger ON public.iron_dome_scores;
CREATE TRIGGER validate_iron_dome_score_trigger
  BEFORE INSERT ON public.iron_dome_scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_iron_dome_score();

CREATE OR REPLACE FUNCTION public.validate_arcade_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.score < 0 OR NEW.score > 5000000 THEN
    RAISE EXCEPTION 'Score out of allowed range';
  END IF;
  IF NEW.level < 0 OR NEW.level > 1000 THEN
    RAISE EXCEPTION 'Level out of allowed range';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_arcade_score_trigger ON public.arcade_scores;
CREATE TRIGGER validate_arcade_score_trigger
  BEFORE INSERT ON public.arcade_scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_arcade_score();
