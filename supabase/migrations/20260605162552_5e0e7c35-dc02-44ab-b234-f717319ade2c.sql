
-- 1. chat_messages: restrict INSERT to authenticated owner
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- 2. game_votes: no public SELECT
DROP POLICY IF EXISTS "Votes viewable by all" ON public.game_votes;

-- 3. iron_dome_scores: explicit deny UPDATE/DELETE for users
CREATE POLICY "No user updates to scores"
  ON public.iron_dome_scores FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "No user deletes to scores"
  ON public.iron_dome_scores FOR DELETE TO authenticated
  USING (false);

-- 4. player_credits: drop user INSERT
DROP POLICY IF EXISTS "Users can insert own credits" ON public.player_credits;

-- 5. player_skill: drop user INSERT and UPDATE
DROP POLICY IF EXISTS "Users can upsert own skill" ON public.player_skill;
DROP POLICY IF EXISTS "Users can update own skill" ON public.player_skill;

-- 6. profiles: restrict SELECT to authenticated only (email no longer public)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 7. profiles: trigger to block users from updating economy fields
CREATE OR REPLACE FUNCTION public.prevent_profile_economy_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.money IS DISTINCT FROM OLD.money
     OR NEW.hearts IS DISTINCT FROM OLD.hearts
     OR NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.wins IS DISTINCT FROM OLD.wins
     OR NEW.fakes_caught IS DISTINCT FROM OLD.fakes_caught
     OR NEW.survived IS DISTINCT FROM OLD.survived
     OR NEW.games_played IS DISTINCT FROM OLD.games_played
     OR NEW.current_level IS DISTINCT FROM OLD.current_level
     OR NEW.unlocked_levels IS DISTINCT FROM OLD.unlocked_levels
     OR NEW.admin_max_level IS DISTINCT FROM OLD.admin_max_level
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected profile fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_economy_update ON public.profiles;
CREATE TRIGGER profiles_block_economy_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_economy_changes();

-- 8. rooms: hide private rooms from non-members
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON public.rooms;
CREATE POLICY "Rooms viewable when public or member"
  ON public.rooms FOR SELECT TO public
  USING (
    is_private = false
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = rooms.id AND rp.user_id = auth.uid()
    )
  );

-- 9. SECURITY DEFINER functions: revoke execute from clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_stat(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_economy_changes() FROM PUBLIC, anon, authenticated;
-- is_admin() is used in RLS policies; keep executable so the planner can evaluate it
-- but it's a stable read-only check so this is safe.

-- 10. storage.objects: drop broad listing policy on avatars bucket
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
-- Public bucket files remain accessible via their direct public URLs;
-- this only prevents anonymous listing of all objects via the API.
