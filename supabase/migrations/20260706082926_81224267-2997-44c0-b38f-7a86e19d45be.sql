
-- 1) game_recordings table
CREATE TABLE IF NOT EXISTS public.game_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text,
  game text NOT NULL,
  level int,
  score int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_recordings TO authenticated;
GRANT INSERT ON public.game_recordings TO anon; -- allow guest sessions to save recordings
GRANT ALL ON public.game_recordings TO service_role;

ALTER TABLE public.game_recordings ENABLE ROW LEVEL SECURITY;

-- Owners (or guests inserting their own) can insert
CREATE POLICY "insert own or guest recordings"
  ON public.game_recordings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Owners can read their own
CREATE POLICY "read own recordings"
  ON public.game_recordings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read/delete all
CREATE POLICY "admins read all recordings"
  ON public.game_recordings
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins delete recordings"
  ON public.game_recordings
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS game_recordings_created_at_idx
  ON public.game_recordings (created_at DESC);
CREATE INDEX IF NOT EXISTS game_recordings_user_id_idx
  ON public.game_recordings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS game_recordings_game_idx
  ON public.game_recordings (game, created_at DESC);

CREATE TRIGGER update_game_recordings_updated_at
  BEFORE UPDATE ON public.game_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Realtime for iron_dome_progress so admin unlocks reach the client instantly
ALTER TABLE public.iron_dome_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.iron_dome_progress;

-- 3) Also mirror admin_max_level realtime for the Portal/Iron Dome level select
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
-- profiles is likely already in the publication; ignore error if so
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    -- already added
    NULL;
  END;
END $$;
