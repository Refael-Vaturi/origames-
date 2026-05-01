CREATE TABLE public.arcade_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Player',
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_arcade_scores_game_score ON public.arcade_scores (game_id, score DESC);
CREATE INDEX idx_arcade_scores_user ON public.arcade_scores (user_id);

ALTER TABLE public.arcade_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arcade scores viewable by everyone"
  ON public.arcade_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own arcade scores"
  ON public.arcade_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);