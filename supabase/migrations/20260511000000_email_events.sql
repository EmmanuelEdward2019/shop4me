-- Stores delivery events received from Resend's webhook (sent, delivered,
-- bounced, opened, complained, etc.). Lets admins inspect exactly what
-- Resend is doing with each transaction email without leaving the Supabase
-- dashboard.

CREATE TABLE IF NOT EXISTS public.email_events (
  id BIGSERIAL PRIMARY KEY,
  email_id TEXT,
  event_type TEXT NOT NULL,
  to_address TEXT,
  from_address TEXT,
  subject TEXT,
  tags JSONB,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_email_id_idx ON public.email_events(email_id);
CREATE INDEX IF NOT EXISTS email_events_event_type_idx ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS email_events_created_at_idx ON public.email_events(created_at DESC);

-- Only admins can read the events directly; the webhook writes via service role.
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email events"
  ON public.email_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
