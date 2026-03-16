-- Support guest players in multiplayer rooms
ALTER TABLE public.room_players
ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_avatar text;

-- Session tokens for guest players (kept separate from publicly readable room_players)
CREATE TABLE IF NOT EXISTS public.room_guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_player_id uuid NOT NULL REFERENCES public.room_players(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.room_guest_sessions ENABLE ROW LEVEL SECURITY;

-- Prevent duplicate guest session rows per room player
CREATE UNIQUE INDEX IF NOT EXISTS room_guest_sessions_room_player_id_idx
  ON public.room_guest_sessions(room_player_id);

-- Improve player list query performance by room
CREATE INDEX IF NOT EXISTS room_players_room_id_idx ON public.room_players(room_id);