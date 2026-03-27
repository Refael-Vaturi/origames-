-- Persistent credits for players (survives across games)
CREATE TABLE public.player_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.player_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.player_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.player_credits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages credits" ON public.player_credits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Adaptive difficulty: store player skill metrics
CREATE TABLE public.player_skill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accuracy float NOT NULL DEFAULT 0.5,
  avg_survival_time float NOT NULL DEFAULT 0,
  avg_wave_reached float NOT NULL DEFAULT 1,
  games_played integer NOT NULL DEFAULT 0,
  skill_rating float NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.player_skill ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill" ON public.player_skill
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own skill" ON public.player_skill
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill" ON public.player_skill
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages skill" ON public.player_skill
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);