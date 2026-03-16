
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scores viewable by all" ON public.game_scores FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages scores" ON public.game_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;
