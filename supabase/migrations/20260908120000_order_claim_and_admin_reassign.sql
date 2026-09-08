-- Fix "this order has been accepted by another agent" + admin re-assignment.
--
-- ROOT CAUSE
-- Orders are created with a store/zone agent already in orders.agent_id, while
-- status stays 'pending'. agent_id is therefore an ASSIGNMENT, not an
-- ACCEPTANCE — but both accept paths treated a non-null agent_id as "taken":
--
--   * accept_order_offer() required (agent_id IS NULL OR agent_id = me), so when
--     the 60s fallback offered the order to a nearer agent, their accept failed
--     with "Order was already taken".
--   * The pull list did a direct UPDATE guarded by `agent_id IS NULL`, and the
--     orders UPDATE policy only permits agent_id = auth.uid() — so a different
--     agent was rejected by the client guard AND by RLS.
--
-- FIX: the real "not yet accepted" signal is status = 'pending'. Claiming is now
-- an atomic conditional update on status (first writer wins), exposed through a
-- SECURITY DEFINER RPC that enforces who may claim — so RLS does not need to be
-- widened for every agent.

-- ── 1. Offer accept: guard on status, not on the pre-assigned agent ──────────
CREATE OR REPLACE FUNCTION public.accept_order_offer(p_offer_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offer public.order_offers;
BEGIN
  SELECT * INTO v_offer FROM public.order_offers WHERE id = p_offer_id FOR UPDATE;
  IF v_offer.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Offer not found'); END IF;
  IF v_offer.agent_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not your offer'); END IF;
  IF v_offer.status <> 'offered' OR v_offer.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This offer has expired');
  END IF;

  -- The dispatcher only offers an order after the assigned agent's grace period,
  -- so an outstanding offer is itself the authorisation to take it over. Guard
  -- solely on status so a pre-assigned (but unaccepted) order can be claimed.
  UPDATE public.orders
  SET agent_id = v_offer.agent_id, status = 'accepted', updated_at = now()
  WHERE id = v_offer.order_id AND status = 'pending';

  IF NOT FOUND THEN
    UPDATE public.order_offers SET status = 'expired', responded_at = now() WHERE id = p_offer_id;
    RETURN json_build_object('success', false, 'error', 'Order was already taken');
  END IF;

  UPDATE public.order_offers SET status = 'accepted', responded_at = now() WHERE id = p_offer_id;
  UPDATE public.order_offers SET status = 'expired'
    WHERE order_id = v_offer.order_id AND id <> p_offer_id AND status = 'offered';

  RETURN json_build_object('success', true, 'order_id', v_offer.order_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_order_offer(uuid) TO authenticated;

-- ── 2. Pull-list claim (replaces the direct UPDATE the app used to do) ───────
CREATE OR REPLACE FUNCTION public.claim_order(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order   public.orders;
  v_uid     uuid := auth.uid();
  v_grace   int  := 60;   -- assigned agent's head start, matches the dispatcher
  v_allowed boolean;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'agent') THEN
    RETURN json_build_object('success', false, 'error', 'Not an agent');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_order.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'This order has already been accepted');
  END IF;

  -- Who may claim a still-pending order:
  --   unassigned, assigned to me, I hold a live offer for it, or the assigned
  --   agent's grace period has lapsed (so it is genuinely up for grabs).
  v_allowed :=
       v_order.agent_id IS NULL
    OR v_order.agent_id = v_uid
    OR v_order.created_at < now() - make_interval(secs => v_grace)
    OR EXISTS (
         SELECT 1 FROM public.order_offers oo
         WHERE oo.order_id = p_order_id AND oo.agent_id = v_uid
           AND oo.status = 'offered' AND oo.expires_at > now()
       );

  IF NOT v_allowed THEN
    RETURN json_build_object('success', false, 'error',
      'This order is reserved for the assigned agent for a moment longer');
  END IF;

  UPDATE public.orders
  SET agent_id = v_uid, status = 'accepted', updated_at = now()
  WHERE id = p_order_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'This order has already been accepted');
  END IF;

  UPDATE public.order_offers SET status = 'expired', responded_at = now()
  WHERE order_id = p_order_id AND status = 'offered';

  RETURN json_build_object('success', true, 'order_id', p_order_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_order(uuid) TO authenticated;

-- ── 3. Admin: list agents to re-assign to ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_agents()
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT p.user_id, p.full_name, p.email
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'agent'
  ORDER BY p.full_name NULLS LAST, p.email;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_agents() TO authenticated;

-- ── 4. Admin: re-assign an order to another agent ───────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reassign_order(p_order_id uuid, p_agent_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF NOT public.has_role(p_agent_id, 'agent') THEN
    RETURN json_build_object('success', false, 'error', 'That user is not an agent');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_order.status IN ('delivered', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error',
      'Order is already ' || v_order.status::text);
  END IF;

  -- Status is left as-is: a pending order stays pending so the new agent still
  -- accepts it (and sees "Assigned to you"); an in-flight order simply changes hands.
  UPDATE public.orders
  SET agent_id = p_agent_id, updated_at = now()
  WHERE id = p_order_id;

  -- Retire any live offers so the auto-dispatcher stops competing with the admin.
  UPDATE public.order_offers SET status = 'expired', responded_at = now()
  WHERE order_id = p_order_id AND status = 'offered';

  RETURN json_build_object(
    'success', true, 'order_id', p_order_id,
    'agent_id', p_agent_id, 'status', v_order.status::text
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_reassign_order(uuid, uuid) TO authenticated;
