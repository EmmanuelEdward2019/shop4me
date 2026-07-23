-- Enables (1) tap-to-call + chat between a rider and the assigned agent of a
-- delivery, and (2) live customer reviews in the admin portal.
--
-- All changes are ADDITIVE. The new profile policies only WIDEN read access
-- (RLS is permissive/OR), so nothing that currently works can break.

-- ── 1. Rider ⇄ Agent mutual profile read (name + phone for calls) ────────────
-- Riders and agents are linked to an order via `rider_alerts` (rider) and
-- `orders.agent_id` (agent). These mirror the existing
-- "Riders can view profiles of their delivery customers" policy pattern.

-- A rider can read the AGENT assigned to an order they are delivering.
DROP POLICY IF EXISTS "Riders can view the agent of their delivery" ON public.profiles;
CREATE POLICY "Riders can view the agent of their delivery"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'rider') AND
  user_id IN (
    SELECT o.agent_id
    FROM public.orders o
    INNER JOIN public.rider_alerts ra ON ra.order_id = o.id
    WHERE ra.rider_id = auth.uid()
      AND o.agent_id IS NOT NULL
  )
);

-- An agent can read the RIDER delivering one of their orders.
DROP POLICY IF EXISTS "Agents can view the rider of their order" ON public.profiles;
CREATE POLICY "Agents can view the rider of their order"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') AND
  user_id IN (
    SELECT ra.rider_id
    FROM public.rider_alerts ra
    INNER JOIN public.orders o ON o.id = ra.order_id
    WHERE o.agent_id = auth.uid()
      AND ra.rider_id IS NOT NULL
  )
);

-- ── 2. Publish agent_reviews for realtime (admin Reviews screen) ─────────────
-- Guarded so it's a safe no-op if already published.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_reviews'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_reviews';
  END IF;
END $$;
