
-- Dynamic content editable via AI Admin
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read site_settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin write site_settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log of AI Admin edits
CREATE TABLE IF NOT EXISTS public.ai_admin_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  prompt text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied boolean NOT NULL DEFAULT false,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_admin_edits TO authenticated;
GRANT ALL ON public.ai_admin_edits TO service_role;

ALTER TABLE public.ai_admin_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read ai_admin_edits"
  ON public.ai_admin_edits FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin insert ai_admin_edits"
  ON public.ai_admin_edits FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
