-- Admin messaging (email + push campaigns), email suppression, push hardening
-- helpers, and automated engagement nudges.

-- ── 1. Email suppressions (unsubscribes, hard bounces, complaints) ──────────
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email      text PRIMARY KEY,
  reason     text NOT NULL CHECK (reason IN ('unsubscribed','bounced','complained','admin')),
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read suppressions" ON public.email_suppressions;
CREATE POLICY "Admins read suppressions" ON public.email_suppressions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins delete suppressions" ON public.email_suppressions;
CREATE POLICY "Admins delete suppressions" ON public.email_suppressions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Resend already logs every event into email_events. Turn hard bounces and spam
-- complaints into suppressions automatically — mailing those addresses again
-- damages sender reputation for every Shop4Me email, including receipts.
CREATE OR REPLACE FUNCTION public.suppress_from_email_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE addr text; v_reason text;
BEGIN
  IF NEW.event_type = 'email.complained' THEN
    v_reason := 'complained';
  ELSIF NEW.event_type = 'email.bounced'
        AND COALESCE(NEW.raw #>> '{data,bounce,type}', '') NOT ILIKE 'transient%' THEN
    v_reason := 'bounced';
  ELSE
    RETURN NEW;
  END IF;
  IF NEW.to_address IS NULL THEN RETURN NEW; END IF;
  FOREACH addr IN ARRAY string_to_array(NEW.to_address, ',') LOOP
    addr := lower(trim(addr));
    IF addr <> '' THEN
      INSERT INTO public.email_suppressions (email, reason, source)
      VALUES (addr, v_reason, 'resend_webhook') ON CONFLICT (email) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_suppress_from_email_event ON public.email_events;
CREATE TRIGGER trg_suppress_from_email_event AFTER INSERT ON public.email_events
  FOR EACH ROW EXECUTE FUNCTION public.suppress_from_email_event();

INSERT INTO public.email_suppressions (email, reason, source)
SELECT DISTINCT ON (lower(trim(a)))
       lower(trim(a)),
       CASE WHEN e.event_type = 'email.complained' THEN 'complained' ELSE 'bounced' END,
       'backfill'
FROM public.email_events e,
     unnest(string_to_array(e.to_address, ',')) AS a
WHERE e.to_address IS NOT NULL AND trim(a) <> ''
  AND (e.event_type = 'email.complained'
       OR (e.event_type = 'email.bounced'
           AND COALESCE(e.raw #>> '{data,bounce,type}', '') NOT ILIKE 'transient%'))
ON CONFLICT (email) DO NOTHING;

-- ── 2. Email campaigns (resumable, chunked sends) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          text NOT NULL,
  preheader        text,
  body_html        text NOT NULL,
  audience         text NOT NULL CHECK (audience IN ('all','role','individual')),
  audience_role    text CHECK (audience_role IN ('buyer','agent','rider','admin')),
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sending','sent','failed','cancelled')),
  total_recipients int NOT NULL DEFAULT 0,
  sent_count       int NOT NULL DEFAULT 0,
  failed_count     int NOT NULL DEFAULT 0,
  skipped_count    int NOT NULL DEFAULT 0,
  last_error       text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  completed_at     timestamptz
);
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  email       text NOT NULL,
  full_name   text,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','sending','sent','failed','skipped')),
  resend_id   text,
  error       text,
  claimed_at  timestamptz,
  sent_at     timestamptz,
  PRIMARY KEY (campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ecr_campaign_status
  ON public.email_campaign_recipients (campaign_id, status);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read email campaigns" ON public.email_campaigns;
CREATE POLICY "Admins read email campaigns" ON public.email_campaigns
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins read campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins read campaign recipients" ON public.email_campaign_recipients
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── 3. Push campaigns log + dedupe ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','nudge')),
  nudge_kind    text,
  title         text NOT NULL,
  body          text NOT NULL,
  audience      text NOT NULL,
  audience_role text,
  deep_link     text,
  target_users  int NOT NULL DEFAULT 0,
  web_sent      int NOT NULL DEFAULT 0,
  expo_sent     int NOT NULL DEFAULT 0,
  failed        int NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read push campaigns" ON public.push_campaigns;
CREATE POLICY "Admins read push campaigns" ON public.push_campaigns
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- One-time announcement keys (e.g. "new_order:<id>") so the same event is never
-- pushed twice when both the DB webhook and a client fire for it.
CREATE TABLE IF NOT EXISTS public.push_dedupe (
  key        text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_dedupe ENABLE ROW LEVEL SECURITY;  -- service role only

-- Who a signed-in, non-admin caller may push: someone they share an order with
-- (buyer / agent / rider via rider_alerts) or have an existing chat thread with.
-- Mirrors every legitimate client push in the web + mobile apps.
CREATE OR REPLACE FUNCTION public.push_permitted_targets(
  p_caller uuid, p_targets uuid[], p_order_id uuid DEFAULT NULL
) RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT t), '{}'::uuid[])
  FROM unnest(p_targets) AS t
  WHERE t IS NOT NULL AND t <> p_caller AND (
    EXISTS (
      SELECT 1
      FROM public.orders o
      LEFT JOIN public.rider_alerts ra ON ra.order_id = o.id
      WHERE (p_order_id IS NULL OR o.id = p_order_id)
        AND (p_caller = o.user_id OR p_caller = o.agent_id
             OR p_caller = ra.rider_id OR p_caller = ra.agent_id)
        AND (t = o.user_id OR t = o.agent_id OR t = ra.rider_id OR t = ra.agent_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE (m.sender_id = p_caller AND m.receiver_id = t)
         OR (m.sender_id = t AND m.receiver_id = p_caller)
    )
  );
$$;
REVOKE ALL ON FUNCTION public.push_permitted_targets(uuid, uuid[], uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_permitted_targets(uuid, uuid[], uuid) TO service_role;

-- ── 4. Engagement nudges ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.engagement_nudge_settings (
  kind               text PRIMARY KEY CHECK (kind IN ('never_ordered','inactive','idle_wallet')),
  enabled            boolean NOT NULL DEFAULT false,
  title              text NOT NULL,
  body               text NOT NULL,
  deep_link          text NOT NULL DEFAULT 'home',
  min_days           int NOT NULL CHECK (min_days BETWEEN 1 AND 365),
  cooldown_days      int NOT NULL CHECK (cooldown_days BETWEEN 1 AND 365),
  wallet_min_balance numeric(12,2) NOT NULL DEFAULT 500,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
-- Shipped DISABLED: an admin reviews the copy and switches each one on.
INSERT INTO public.engagement_nudge_settings
  (kind, enabled, title, body, deep_link, min_days, cooldown_days, wallet_min_balance)
VALUES
  ('never_ordered', false, 'Your first order is waiting 🛒',
   'Send your shopping list and a verified agent will shop it for you — delivered to your door.',
   'new_order', 2, 7, 500),
  ('inactive', false, 'We miss you at Shop4Me 💚',
   'Skip the market this week — send your list and we''ll handle the rest.',
   'new_order', 14, 14, 500),
  ('idle_wallet', false, 'You have money in your wallet 💰',
   'Put your Shop4Me wallet balance to work on your next order — it only takes a minute.',
   'wallet', 7, 7, 500)
ON CONFLICT (kind) DO NOTHING;
ALTER TABLE public.engagement_nudge_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read nudge settings" ON public.engagement_nudge_settings;
CREATE POLICY "Admins read nudge settings" ON public.engagement_nudge_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins update nudge settings" ON public.engagement_nudge_settings;
CREATE POLICY "Admins update nudge settings" ON public.engagement_nudge_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.engagement_nudge_log (
  id      bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind    text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enl_user_kind_sent ON public.engagement_nudge_log (user_id, kind, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_enl_sent ON public.engagement_nudge_log (sent_at DESC);
ALTER TABLE public.engagement_nudge_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read nudge log" ON public.engagement_nudge_log;
CREATE POLICY "Admins read nudge log" ON public.engagement_nudge_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.engagement_run_state (
  id int PRIMARY KEY CHECK (id = 1),
  last_run_at timestamptz
);
INSERT INTO public.engagement_run_state (id, last_run_at) VALUES (1, NULL) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.engagement_run_state ENABLE ROW LEVEL SECURITY;  -- service role only

-- The nudge endpoint is reachable by the cron job, so it may be hit by anyone.
-- This makes that harmless: a run happens at most once per interval (>= 30 min),
-- and per-user cooldowns below still apply.
CREATE OR REPLACE FUNCTION public.claim_engagement_run(p_min_interval_minutes int DEFAULT 60)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_updated int;
BEGIN
  UPDATE public.engagement_run_state
  SET last_run_at = now()
  WHERE id = 1
    AND (last_run_at IS NULL
         OR last_run_at < now() - make_interval(mins => GREATEST(p_min_interval_minutes, 30)));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END; $$;
REVOKE ALL ON FUNCTION public.claim_engagement_run(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_engagement_run(int) TO service_role;

CREATE OR REPLACE FUNCTION public.get_nudge_candidates(p_kind text, p_limit int DEFAULT 1000)
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.engagement_nudge_settings;
BEGIN
  SELECT * INTO s FROM public.engagement_nudge_settings WHERE kind = p_kind;
  IF s.kind IS NULL OR NOT s.enabled THEN RETURN; END IF;

  RETURN QUERY
  WITH buyers AS (
    SELECT p.user_id, p.created_at
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'buyer'
    WHERE COALESCE(p.is_suspended, false) = false
  ),
  reachable AS (
    SELECT b.* FROM buyers b
    WHERE EXISTS (SELECT 1 FROM public.expo_push_tokens t WHERE t.user_id = b.user_id)
       OR EXISTS (SELECT 1 FROM public.push_subscriptions w WHERE w.user_id = b.user_id)
  ),
  eligible AS (
    SELECT r.* FROM reachable r
    WHERE NOT EXISTS (   -- same nudge within its cooldown
            SELECT 1 FROM public.engagement_nudge_log l
            WHERE l.user_id = r.user_id AND l.kind = p_kind
              AND l.sent_at > now() - make_interval(days => s.cooldown_days))
      AND NOT EXISTS (   -- global cap: at most one nudge of any kind per 3 days
            SELECT 1 FROM public.engagement_nudge_log l
            WHERE l.user_id = r.user_id AND l.sent_at > now() - interval '3 days')
  )
  SELECT e.user_id FROM eligible e
  WHERE CASE p_kind
    WHEN 'never_ordered' THEN
      e.created_at < now() - make_interval(days => s.min_days)
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = e.user_id)
    WHEN 'inactive' THEN
      EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = e.user_id)
      AND NOT EXISTS (SELECT 1 FROM public.orders o
                      WHERE o.user_id = e.user_id
                        AND o.created_at > now() - make_interval(days => s.min_days))
    WHEN 'idle_wallet' THEN
      EXISTS (SELECT 1 FROM public.wallets w
              WHERE w.user_id = e.user_id AND w.balance >= s.wallet_min_balance)
      AND NOT EXISTS (SELECT 1 FROM public.orders o
                      WHERE o.user_id = e.user_id
                        AND o.created_at > now() - make_interval(days => s.min_days))
    ELSE false
  END
  LIMIT GREATEST(LEAST(p_limit, 5000), 1);
END; $$;
REVOKE ALL ON FUNCTION public.get_nudge_candidates(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nudge_candidates(text, int) TO service_role;

-- Keep the dedupe table small.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-push-dedupe') THEN
    PERFORM cron.unschedule('cleanup-push-dedupe');
  END IF;
  PERFORM cron.schedule('cleanup-push-dedupe', '30 3 * * *',
    $c$DELETE FROM public.push_dedupe WHERE created_at < now() - interval '7 days'$c$);
END $$;
