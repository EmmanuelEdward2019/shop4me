-- Add the rider withdrawal/earnings tables to the `supabase_realtime`
-- publication. The mobile app subscribes to `rider_withdrawals` and expects the
-- status to transition `transferred → confirmed` live; without the table in the
-- publication that UPDATE event never reaches the client. The AGENT mirror was
-- already published (20260527000000_agent_withdrawals.sql); the rider tables
-- were never added in any migration.
--
-- Fully idempotent: the guarded DO block only publishes a table when it isn't
-- already published, so this is a safe no-op if realtime was toggled on via the
-- dashboard. REPLICA IDENTITY FULL makes UPDATE payloads carry the whole row so
-- the client's change handlers see the new status/amount.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rider_withdrawals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_withdrawals';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rider_earnings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_earnings';
  END IF;
END $$;

ALTER TABLE public.rider_withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.rider_earnings REPLICA IDENTITY FULL;
