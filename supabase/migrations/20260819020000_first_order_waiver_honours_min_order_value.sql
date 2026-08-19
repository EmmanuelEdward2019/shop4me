-- Honour bonuses.min_order_value in the first-order delivery waiver.
--
-- The admin Bonuses form offers a "Minimum Order Value" field and the RN promo
-- chip renders "on orders above ₦X", but the eligibility function never looked
-- at it. An admin configuring "free delivery on first orders above ₦5,000"
-- would have granted it on every first order regardless of basket size.
--
-- Adds p_subtotal. When a promo row carries a threshold, the basket must meet
-- it. An unknown subtotal fails the check rather than passing it, so a caller
-- that omits the amount cannot bypass the threshold.

-- The 2-arg version must go, or calls with two arguments become ambiguous
-- against the new one's defaulted third parameter.
DROP FUNCTION IF EXISTS public.is_first_order_delivery_free(uuid, uuid);

CREATE OR REPLACE FUNCTION public.is_first_order_delivery_free(
  p_buyer_id uuid,
  p_order_id uuid     DEFAULT NULL,
  p_subtotal numeric  DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_live boolean;
  v_paid_count integer;
  v_held_count integer;
BEGIN
  IF p_buyer_id IS NULL THEN
    RETURN false;
  END IF;

  -- The promotion must be switched on by an admin in the Bonuses dashboard,
  -- be within its date window, and its minimum-order threshold (if any) met.
  SELECT EXISTS (
    SELECT 1 FROM public.bonuses b
    WHERE b.type = 'first_order_free_delivery'
      AND b.is_active = true
      AND (b.start_date IS NULL OR b.start_date <= now())
      AND (b.end_date   IS NULL OR b.end_date   >= now())
      AND (
        b.min_order_value IS NULL
        OR (p_subtotal IS NOT NULL AND p_subtotal >= b.min_order_value)
      )
  ) INTO v_promo_live;

  IF NOT v_promo_live THEN
    RETURN false;
  END IF;

  -- "First order" = no order has been successfully paid for yet.
  --
  -- Both conditions are needed. payments alone is not enough: the Paystack
  -- webhook marks a payment 'success' BEFORE its underpayment guard runs, so a
  -- rejected underpayment leaves a 'success' row behind on an unpaid order.
  -- orders.status alone is not enough either: a paid order moves on to
  -- in_transit / delivered / completed.
  SELECT count(DISTINCT o.id) INTO v_paid_count
  FROM public.orders o
  JOIN public.payments p ON p.order_id = o.id
  WHERE o.user_id = p_buyer_id
    AND p.status = 'success'
    AND o.status IN ('paid', 'in_transit', 'delivered', 'completed');

  IF v_paid_count > 0 THEN
    RETURN false;
  END IF;

  -- Another live order already holds the waiver → this one does not get it.
  SELECT count(*) INTO v_held_count
  FROM public.orders
  WHERE user_id = p_buyer_id
    AND first_order_waiver = true
    AND status <> 'cancelled'
    AND (p_order_id IS NULL OR id <> p_order_id);

  RETURN v_held_count = 0;
END;
$$;

REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid, numeric) FROM public;
REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_first_order_delivery_free(uuid, uuid, numeric) TO service_role;
