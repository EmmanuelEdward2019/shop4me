-- Make nearest-agent live dispatch a FALLBACK rather than the first step.
--
-- Behaviour now:
--   * On order creation, the existing store/zone assignment is untouched — the
--     dedicated store agent + zone agents still see it in their pull list and
--     get the usual "new order" push. No live offer is made yet.
--   * If the order is STILL pending 60s later (nobody accepted), the nearest
--     available agent is offered the order (order_offers), with the same
--     60s-per-agent cascade to the next-nearest as before.
--
-- Implemented by (1) removing the on-insert dispatch trigger and (2) having the
-- per-minute cron start the fallback for orders unclaimed past the grace period,
-- in addition to cascading expired offers.

-- 1. Stop offering immediately on order creation.
DROP TRIGGER IF EXISTS trg_dispatch_on_insert ON public.orders;

-- 2. Cron worker: kick off fallback dispatch after the grace period, then cascade.
CREATE OR REPLACE FUNCTION public.process_expired_offers()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count int := 0;
  v_grace_seconds int := 60;   -- assigned store/zone agent gets this long first
BEGIN
  -- (a) Fallback kick-in: pending orders with no offer yet, older than the grace
  --     period → offer the nearest available agent.
  FOR r IN
    SELECT o.id
    FROM public.orders o
    WHERE o.status = 'pending'
      AND o.created_at < now() - make_interval(secs => v_grace_seconds)
      AND NOT EXISTS (SELECT 1 FROM public.order_offers oo WHERE oo.order_id = o.id)
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.dispatch_next_agent(r.id);
    v_count := v_count + 1;
  END LOOP;

  -- (b) Cascade: expire timed-out offers and offer the next-nearest agent.
  FOR r IN
    SELECT id, order_id
    FROM public.order_offers
    WHERE status = 'offered' AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.order_offers SET status = 'expired' WHERE id = r.id;
    PERFORM public.dispatch_next_agent(r.order_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- The 'process-order-offers' cron job (every minute) already calls this function,
-- so no re-scheduling is needed.
