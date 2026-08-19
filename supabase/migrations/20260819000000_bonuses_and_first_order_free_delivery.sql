-- Bonuses + "first order, free delivery" promotion
--
-- Two things are added here:
--
--   1. public.bonuses — the table AdminBonuses.tsx and the RN buyer dashboard
--      have both been querying since launch. It never existed, so every save
--      from the admin dashboard failed with
--      "Could not find the table 'public.bonuses' in the schema cache".
--
--   2. The enforcement path for the advertised promotion: a customer's first
--      successfully-paid order has its BASE delivery fee waived.
--
-- Business rules (as specified):
--   * "First order" = the buyer has no successful order payment yet.
--   * Only the BASE delivery fee is waived. A heavy-order surcharge is still
--     charged. Surge is a multiplier on the base, so it falls out to zero.
--   * Rider earnings absorb the cost: create_rider_earning_on_completion()
--     splits orders.delivery_fee 85/15, so a waived order pays the rider 0.

-- ─── BONUSES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonuses (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title           text        NOT NULL,
  description     text,
  type            text        NOT NULL,
  discount_value  numeric     NOT NULL DEFAULT 0,
  min_order_value numeric,
  is_active       boolean     NOT NULL DEFAULT true,
  start_date      timestamptz,
  end_date        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

-- Buyers see only live offers (the RN dashboard renders these as promo chips).
CREATE POLICY "Anyone can read active bonuses"
  ON public.bonuses FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date   IS NULL OR end_date   >= now())
  );

CREATE POLICY "Admins can read all bonuses"
  ON public.bonuses FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert bonuses"
  ON public.bonuses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bonuses"
  ON public.bonuses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bonuses"
  ON public.bonuses FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS bonuses_active_type_idx
  ON public.bonuses (type, is_active);

-- ─── WAIVER AUDIT FLAG ──────────────────────────────────────────────────────
-- Records that an order consumed the promotion. Also stops a buyer from
-- opening several unpaid orders and collecting the waiver on each of them.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS first_order_waiver boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS orders_first_order_waiver_idx
  ON public.orders (user_id) WHERE first_order_waiver = true;

-- ─── ELIGIBILITY ────────────────────────────────────────────────────────────
-- SECURITY DEFINER: callers must not need read access to other buyers' orders
-- or payments to get a yes/no answer.
CREATE OR REPLACE FUNCTION public.is_first_order_delivery_free(
  p_buyer_id uuid,
  p_order_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_live   boolean;
  v_paid_count   integer;
  v_held_count   integer;
BEGIN
  IF p_buyer_id IS NULL THEN
    RETURN false;
  END IF;

  -- The promotion must be switched on by an admin in the Bonuses dashboard.
  SELECT EXISTS (
    SELECT 1 FROM public.bonuses
    WHERE type = 'first_order_free_delivery'
      AND is_active = true
      AND (start_date IS NULL OR start_date <= now())
      AND (end_date   IS NULL OR end_date   >= now())
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
  -- in_transit / delivered / completed. Requiring both is accurate for wallet
  -- and Paystack alike.
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

-- service_role only. calculate-order-fees calls this with the service key, and
-- clients read the answer off the fee quote instead. Leaving it callable by
-- `authenticated` would let any signed-in user probe whether an arbitrary
-- user id has ever paid for an order.
REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) TO service_role;
