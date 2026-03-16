
CREATE TABLE public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  word_en text NOT NULL,
  word_he text NOT NULL,
  fake_player_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

CREATE TABLE public.game_hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  hint_round integer NOT NULL,
  hint_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id, hint_round)
);

CREATE TABLE public.game_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL,
  voted_player_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, voter_id)
);

ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game rounds viewable by all" ON public.game_rounds FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages rounds" ON public.game_rounds FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Hints viewable by all" ON public.game_hints FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages hints" ON public.game_hints FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Votes viewable by all" ON public.game_votes FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages votes" ON public.game_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_hints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_votes;
