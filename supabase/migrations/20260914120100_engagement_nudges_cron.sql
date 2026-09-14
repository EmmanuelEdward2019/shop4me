-- Daily engagement nudges: pg_cron -> pg_net -> engagement-nudges edge function.
-- Kept in its own migration so that if pg_net is unavailable only the schedule
-- fails, not the messaging schema.
--
-- The bearer below is the PUBLIC anon key (already shipped in the web bundle).
-- The endpoint is safe to expose: claim_engagement_run() limits it to one run
-- per hour and every user has per-nudge and global cooldowns.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'engagement-nudges-daily') THEN
    PERFORM cron.unschedule('engagement-nudges-daily');
  END IF;
  -- 08:00 UTC = 09:00 WAT
  PERFORM cron.schedule('engagement-nudges-daily', '0 8 * * *', $c$
    SELECT net.http_post(
      url := 'https://iutxschzfxgntniurrmj.supabase.co/functions/v1/engagement-nudges',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHhzY2h6ZnhnbnRuaXVycm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc0NDEsImV4cCI6MjA4NTU2MzQ0MX0.6y9x-FEBKPM5GV3GncnaNTkrFKFylWS5AfrB0VTH9Y0'
      ),
      body := jsonb_build_object('source', 'cron'),
      timeout_milliseconds := 60000
    );
  $c$);
END $$;
