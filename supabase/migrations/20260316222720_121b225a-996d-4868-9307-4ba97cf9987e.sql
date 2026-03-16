
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  player_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat viewable by all" ON public.chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.chat_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service role manages chat" ON public.chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
