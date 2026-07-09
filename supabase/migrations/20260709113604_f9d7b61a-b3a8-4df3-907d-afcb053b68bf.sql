
DROP POLICY IF EXISTS "Scores viewable by all" ON public.game_scores;
CREATE POLICY "Room members can view scores"
ON public.game_scores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.game_rounds gr
    JOIN public.room_players rp ON rp.room_id = gr.room_id
    WHERE gr.id = game_scores.round_id
      AND rp.user_id = auth.uid()
  )
);
