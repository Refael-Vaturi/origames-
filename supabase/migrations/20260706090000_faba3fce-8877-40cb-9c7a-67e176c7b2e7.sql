-- Restore profiles_public to actually serve its purpose (readable across
-- users for friends list / leaderboards / room player-name lookups).
--
-- Migration 20260706082951 recreated this view with security_invoker=true.
-- Combined with the "profiles" table's own-row-only SELECT policy (added in
-- an earlier migration), that setting made the view respect the caller's
-- own RLS — so every user could only ever see their OWN row through it,
-- silently breaking any feature that reads another user's row (friends
-- list, leaderboards, room player names). It also dropped the "id" and
-- "last_seen" columns that src/hooks/useFriends.ts relies on.
--
-- Recreating without security_invoker restores the intended behavior: the
-- view runs with its owner's privileges, so it can safely expose these
-- specific non-sensitive columns for every user, while the base table stays
-- locked down to "your own row only" for direct access.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  user_id,
  display_name,
  username,
  avatar_url,
  level,
  country,
  last_seen
FROM public.profiles;

-- Granted to anon too: guest players (unauthenticated) in Fake It Fast rooms
-- still need to read authenticated players' display names client-side.
GRANT SELECT ON public.profiles_public TO anon, authenticated;
