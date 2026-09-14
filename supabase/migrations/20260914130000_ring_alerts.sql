-- Loud "ring" alerts for orders, rider requests and messages.
--
-- 1. expo_push_tokens.sound_version — app builds that bundle the custom ring
--    sounds (and create the v2 Android channels) register with 2. The push
--    function only sends the custom sound/channel to those tokens; older
--    installs keep the original channel so nothing goes silent.
-- 2. Announce every new order from the database itself. Orders placed from the
--    mobile app relied on a dashboard-configured webhook that isn't tracked in
--    migrations; this makes the agent push independent of the client. The push
--    function re-reads the order and de-duplicates (push_dedupe), so the web
--    client's own call or an existing webhook can't double-notify.

ALTER TABLE public.expo_push_tokens
  ADD COLUMN IF NOT EXISTS sound_version int NOT NULL DEFAULT 1;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.announce_new_order_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status::text = 'pending' THEN
    BEGIN
      -- Queued by pg_net and sent after this transaction commits.
      PERFORM net.http_post(
        url := 'https://iutxschzfxgntniurrmj.supabase.co/functions/v1/send-push-notification',
        body := jsonb_build_object(
          'type', 'INSERT', 'table', 'orders', 'schema', 'public',
          'record', jsonb_build_object('id', NEW.id)
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0'
        ),
        timeout_milliseconds := 15000
      );
    EXCEPTION WHEN others THEN
      -- Never block order creation because a notification couldn't be queued.
      RAISE WARNING 'announce_new_order_push failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_announce_push ON public.orders;
CREATE TRIGGER trg_orders_announce_push
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.announce_new_order_push();
