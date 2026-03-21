
CREATE TABLE public.iron_dome_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Player',
  score INTEGER NOT NULL DEFAULT 0,
  wave INTEGER NOT NULL DEFAULT 1,
  max_combo INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'campaign',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.iron_dome_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view the leaderboard
CREATE POLICY "Leaderboard viewable by everyone"
  ON public.iron_dome_scores FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert their own scores
CREATE POLICY "Users can insert own scores"
  ON public.iron_dome_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.iron_dome_scores;
