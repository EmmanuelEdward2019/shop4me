-- Canonical, race-free helpers for the rider side of the delivery state
-- machine. Purely additive — these do NOT replace any existing UPDATE
-- paths the apps already use, they just give the client a single
-- bullet-proof entry point per transition. Each RPC validates the
-- caller's identity, the alert's current state, and updates the row
-- atomically.
--
-- The downstream triggers stay unchanged:
--   • `set_order_in_transit_on_pickup` fires when order_picked_up_at
--     becomes non-null, flipping orders.status to 'in_transit'.
--   • `create_rider_earning_on_completion` fires when rider_alerts.status
--     becomes 'completed', creating the payout row.
--
-- Web/RN clients that already write rider_alerts rows directly will
-- continue to work; new clients (or old clients we update) should call
-- these RPCs instead to avoid race conditions and accidental
-- backward-state writes.

-- ─── mark_rider_arrived ──────────────────────────────────────────────
-- Called by the rider when they reach the pickup store. No-op if
-- already marked.
CREATE OR REPLACE FUNCTION public.mark_rider_arrived(p_alert_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.rider_alerts;
BEGIN
  SELECT * INTO v_alert FROM public.rider_alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Alert not found');
  END IF;
  IF v_alert.rider_id IS NULL OR v_alert.rider_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not your delivery');
  END IF;
  IF v_alert.rider_arrived_at IS NOT NULL THEN
    -- Idempotent: tapping "Arrived" twice should not error.
    RETURN json_build_object('success', true, 'already', true);
  END IF;
  UPDATE public.rider_alerts
    SET rider_arrived_at = now(), updated_at = now()
    WHERE id = p_alert_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_rider_arrived(uuid) TO authenticated;

-- ─── mark_rider_picked_up ────────────────────────────────────────────
-- Called by the rider once they have the packed order. Requires the
-- agent to have flagged `order_packed = true` first. Sets
-- `order_picked_up_at`, which fires the existing trigger that flips
-- the parent order to 'in_transit'.
CREATE OR REPLACE FUNCTION public.mark_rider_picked_up(p_alert_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.rider_alerts;
BEGIN
  SELECT * INTO v_alert FROM public.rider_alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Alert not found');
  END IF;
  IF v_alert.rider_id IS NULL OR v_alert.rider_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not your delivery');
  END IF;
  IF NOT v_alert.order_packed THEN
    RETURN json_build_object('success', false, 'error', 'Order not packed yet');
  END IF;
  IF v_alert.order_picked_up_at IS NOT NULL THEN
    RETURN json_build_object('success', true, 'already', true);
  END IF;
  UPDATE public.rider_alerts
    SET order_picked_up_at = now(),
        rider_arrived_at = COALESCE(rider_arrived_at, now()),
        updated_at = now()
    WHERE id = p_alert_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_rider_picked_up(uuid) TO authenticated;

-- ─── mark_delivery_complete ──────────────────────────────────────────
-- Called by the rider after handing the order to the buyer. Marks the
-- rider_alert as 'completed' (which fires the earnings trigger) AND
-- flips the parent order to 'delivered'. Idempotent.
CREATE OR REPLACE FUNCTION public.mark_delivery_complete(p_alert_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.rider_alerts;
BEGIN
  SELECT * INTO v_alert FROM public.rider_alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Alert not found');
  END IF;
  IF v_alert.rider_id IS NULL OR v_alert.rider_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not your delivery');
  END IF;
  IF v_alert.order_picked_up_at IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order not picked up yet');
  END IF;
  IF v_alert.status = 'completed' THEN
    RETURN json_build_object('success', true, 'already', true);
  END IF;
  UPDATE public.rider_alerts
    SET status = 'completed', updated_at = now()
    WHERE id = p_alert_id;
  UPDATE public.orders
    SET status = 'delivered', updated_at = now()
    WHERE id = v_alert.order_id
      AND status NOT IN ('delivered', 'cancelled');
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_delivery_complete(uuid) TO authenticated;

-- ─── mark_order_packed ───────────────────────────────────────────────
-- Agent-side helper: flips order_packed → true. Already possible via
-- direct UPDATE (web does that), but exposing as an RPC keeps the API
-- surface symmetric so RN can use one consistent pattern for every
-- state transition.
CREATE OR REPLACE FUNCTION public.mark_order_packed(p_alert_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.rider_alerts;
BEGIN
  SELECT * INTO v_alert FROM public.rider_alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Alert not found');
  END IF;
  IF v_alert.agent_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not your order');
  END IF;
  IF v_alert.order_packed THEN
    RETURN json_build_object('success', true, 'already', true);
  END IF;
  UPDATE public.rider_alerts
    SET order_packed = true, updated_at = now()
    WHERE id = p_alert_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_packed(uuid) TO authenticated;

-- ─── Realtime: publish rider_alerts so both sides re-render on transitions
-- (Idempotent — only adds the table if it isn't already in the
--  supabase_realtime publication.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rider_alerts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_alerts';
  END IF;
END $$;
