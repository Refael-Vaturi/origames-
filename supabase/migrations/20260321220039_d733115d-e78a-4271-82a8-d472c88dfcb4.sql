
-- Drop the public SELECT policy on game_rounds
DROP POLICY IF EXISTS "Game rounds viewable by all" ON public.game_rounds;

-- Create a restricted SELECT policy for service_role only
CREATE POLICY "Only service role can read game rounds"
ON public.game_rounds FOR SELECT
TO service_role
USING (true);
