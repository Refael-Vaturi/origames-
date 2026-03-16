DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'room_guest_sessions'
      AND policyname = 'Service role can manage guest sessions'
  ) THEN
    CREATE POLICY "Service role can manage guest sessions"
    ON public.room_guest_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;