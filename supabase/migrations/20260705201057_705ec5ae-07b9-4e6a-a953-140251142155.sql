
-- 1) Chat messages: restrict SELECT to signed-in room members
DROP POLICY IF EXISTS "Chat viewable by all" ON public.chat_messages;
CREATE POLICY "Chat viewable by room members"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = chat_messages.room_id
        AND rp.user_id = auth.uid()
    )
  );

-- 2) Game hints: restrict SELECT to players in the round's room
DROP POLICY IF EXISTS "Hints viewable by all" ON public.game_hints;
CREATE POLICY "Hints viewable by round players"
  ON public.game_hints
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_rounds gr
      JOIN public.room_players rp ON rp.room_id = gr.room_id
      WHERE gr.id = game_hints.round_id
        AND rp.user_id = auth.uid()
    )
  );

-- 3) Room players: only expose members of a room, or all rows for public rooms
DROP POLICY IF EXISTS "Room players are viewable by everyone" ON public.room_players;
CREATE POLICY "Room players viewable by members or public rooms"
  ON public.room_players
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_players.room_id
        AND r.is_private = false
    )
    OR EXISTS (
      SELECT 1 FROM public.room_players self
      WHERE self.room_id = room_players.room_id
        AND self.user_id = auth.uid()
    )
  );

-- 4) Convert is_admin() to SECURITY INVOKER (reads JWT only, no elevation needed)
ALTER FUNCTION public.is_admin() SECURITY INVOKER;

-- 5) Revoke public/anon/authenticated EXECUTE on SECURITY DEFINER functions.
--    They remain callable by service_role (used by the admin-rpc edge function
--    and by internal triggers).
REVOKE EXECUTE ON FUNCTION public.increment_profile_stat(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_iron_dome_level(uuid, integer)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_iron_dome(uuid)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_player_credits(uuid, integer)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_add_player_credits(uuid, integer)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_room(uuid)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_economy_changes()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()                 FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.increment_profile_stat(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_iron_dome_level(uuid, integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_iron_dome(uuid)                TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_player_credits(uuid, integer)    TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_player_credits(uuid, integer)    TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_room(uuid)                    TO service_role;
