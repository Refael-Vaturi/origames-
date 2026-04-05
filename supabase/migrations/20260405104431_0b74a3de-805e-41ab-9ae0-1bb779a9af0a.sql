
CREATE TABLE public.iron_dome_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  max_level INTEGER NOT NULL DEFAULT 1,
  stars JSONB NOT NULL DEFAULT '{}'::jsonb,
  upgrades JSONB NOT NULL DEFAULT '{}'::jsonb,
  best_wave INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.iron_dome_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.iron_dome_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.iron_dome_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.iron_dome_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_iron_dome_progress_updated_at
  BEFORE UPDATE ON public.iron_dome_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
