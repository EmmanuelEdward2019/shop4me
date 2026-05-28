-- =============================================================================
-- TEST ACCOUNT ROUTING
-- Purpose: Wire Google Play Console test accounts so the full order lifecycle
--          is reviewable end-to-end without human intervention:
--
--    test_buyer@shop4meng.com  places an order
--        → immediately pre-assigned to test_agent@shop4meng.com
--        → when a rider_alert is created for that order, test_rider is set
--
-- SAFETY GUARANTEE: Every check is guarded by "is this a test-buyer order?"
-- so absolutely NO changes propagate to orders placed by real users.
-- =============================================================================

-- ── 0. Resolve test user IDs once (idempotent helper table) ─────────────────
CREATE TABLE IF NOT EXISTS public.test_account_config (
  key   text PRIMARY KEY,
  value uuid NOT NULL
);

-- Populate / refresh on every run
INSERT INTO public.test_account_config (key, value)
SELECT 'buyer_id', id FROM auth.users WHERE email = 'test_buyer@shop4meng.com'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.test_account_config (key, value)
SELECT 'agent_id', id FROM auth.users WHERE email = 'test_agent@shop4meng.com'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.test_account_config (key, value)
SELECT 'rider_id', id FROM auth.users WHERE email = 'test_rider@shop4meng.com'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Grant authenticated users to read this config (agents/riders need to join against it)
ALTER TABLE public.test_account_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage test config" ON public.test_account_config;
CREATE POLICY "Admins can manage test config"
  ON public.test_account_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read test config" ON public.test_account_config;
CREATE POLICY "Authenticated users can read test config"
  ON public.test_account_config FOR SELECT
  TO authenticated
  USING (true);

-- ── 1. TRIGGER: auto-assign test orders to test agent on INSERT ───────────────
-- Fires BEFORE INSERT on orders.
-- If the new order belongs to the test buyer, stamp agent_id with the test
-- agent's ID so the order appears instantly in the test agent's queue.
-- All other orders are untouched.

CREATE OR REPLACE FUNCTION public.auto_assign_test_order_to_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id  uuid;
  v_agent_id  uuid;
BEGIN
  -- Load test account IDs
  SELECT value INTO v_buyer_id FROM public.test_account_config WHERE key = 'buyer_id';
  SELECT value INTO v_agent_id FROM public.test_account_config WHERE key = 'agent_id';

  -- Only act if this order is from the test buyer and config is complete
  IF v_buyer_id IS NOT NULL
     AND v_agent_id IS NOT NULL
     AND NEW.user_id = v_buyer_id
  THEN
    NEW.agent_id := v_agent_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_test_order_insert ON public.orders;
CREATE TRIGGER on_test_order_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_test_order_to_agent();

-- ── 2. TRIGGER: auto-assign test rider_alerts to test rider ──────────────────
-- Fires BEFORE INSERT on rider_alerts.
-- If the alert belongs to a test-buyer order, stamp rider_id with the test
-- rider's ID so the delivery appears instantly in the test rider's queue.
-- All other alerts are untouched.

CREATE OR REPLACE FUNCTION public.auto_assign_test_rider_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id  uuid;
  v_rider_id  uuid;
  v_order_buyer uuid;
BEGIN
  -- Load test account IDs
  SELECT value INTO v_buyer_id FROM public.test_account_config WHERE key = 'buyer_id';
  SELECT value INTO v_rider_id FROM public.test_account_config WHERE key = 'rider_id';

  -- Resolve the buyer for this order
  SELECT user_id INTO v_order_buyer
  FROM public.orders
  WHERE id = NEW.order_id;

  -- Only act for test-buyer orders and when config is complete
  IF v_buyer_id IS NOT NULL
     AND v_rider_id IS NOT NULL
     AND v_order_buyer = v_buyer_id
  THEN
    NEW.rider_id := v_rider_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_test_rider_alert_insert ON public.rider_alerts;
CREATE TRIGGER on_test_rider_alert_insert
  BEFORE INSERT ON public.rider_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_test_rider_alert();

-- ── 3. UPDATE get_available_orders_nearby to always surface test orders ───────
-- The test agent's application has no GPS or zone data (synthetic row), so
-- test-buyer orders would never appear in the normal geo-query. We add a
-- short-circuit: if p_agent_id IS the test agent, prepend all pending orders
-- placed by the test buyer. Real agents are completely unaffected.
-- We also add the test-buyer check as an extra OR in the main query for
-- the case where the test agent does have geo data set later.

CREATE OR REPLACE FUNCTION public.get_available_orders_nearby(p_agent_id uuid)
RETURNS SETOF orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_lat  numeric;
  v_agent_lng  numeric;
  v_radius_km  numeric;
  v_agent_zone text;
  v_test_agent_id uuid;
  v_test_buyer_id uuid;
BEGIN
  -- ── Load test account IDs (NULL if rows are missing) ──────────────────────
  SELECT value INTO v_test_agent_id FROM public.test_account_config WHERE key = 'agent_id';
  SELECT value INTO v_test_buyer_id FROM public.test_account_config WHERE key = 'buyer_id';

  -- ── Short-circuit: test agent always sees test-buyer's pending orders ──────
  -- This block is ONLY entered when p_agent_id = test agent's UUID.
  -- Normal agents never enter here.
  IF v_test_agent_id IS NOT NULL
     AND p_agent_id = v_test_agent_id
     AND v_test_buyer_id IS NOT NULL
  THEN
    RETURN QUERY
    SELECT o.*
    FROM public.orders o
    WHERE o.status = 'pending'
      AND o.user_id = v_test_buyer_id
      AND (o.agent_id IS NULL OR o.agent_id = p_agent_id)
    ORDER BY o.created_at DESC;

    RETURN; -- exit early — test agent only sees test orders
  END IF;

  -- ── Normal routing path (unchanged for all real agents) ───────────────────
  SELECT service_latitude, service_longitude, service_radius_km
  INTO v_agent_lat, v_agent_lng, v_radius_km
  FROM agent_applications
  WHERE user_id = p_agent_id AND status = 'approved'
  LIMIT 1;

  SELECT service_zone INTO v_agent_zone
  FROM profiles
  WHERE user_id = p_agent_id;

  IF v_agent_lat IS NOT NULL AND v_agent_lng IS NOT NULL AND v_radius_km IS NOT NULL THEN
    RETURN QUERY
    SELECT o.*
    FROM orders o
    LEFT JOIN stores s ON lower(trim(s.name)) = lower(trim(o.location_name))
    WHERE o.status = 'pending'
      AND (o.agent_id IS NULL OR o.agent_id = p_agent_id)
      -- Exclude test-buyer orders from real agents' queues
      AND (v_test_buyer_id IS NULL OR o.user_id <> v_test_buyer_id)
      AND (
        -- Pre-assigned directly to this agent
        o.agent_id = p_agent_id
        OR
        -- One of the dedicated store agents (multi-agent support)
        EXISTS (
          SELECT 1 FROM store_agents sa
          WHERE sa.store_id = s.id AND sa.agent_id = p_agent_id
        )
        OR
        -- GPS radius match
        (s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND
         ST_DWithin(
           ST_MakePoint(s.longitude, s.latitude)::geography,
           ST_MakePoint(v_agent_lng::float8, v_agent_lat::float8)::geography,
           v_radius_km * 1000
         ))
        OR
        -- Zone fallback when store has no GPS
        (s.latitude IS NULL AND (
          (v_agent_zone IS NOT NULL AND o.service_zone = v_agent_zone)
          OR (v_agent_zone IS NULL AND o.service_zone IS NULL)
        ))
        OR
        -- No store matched at all — zone fallback
        (s.id IS NULL AND (
          (v_agent_zone IS NOT NULL AND o.service_zone = v_agent_zone)
          OR (v_agent_zone IS NULL AND o.service_zone IS NULL)
        ))
      )
    ORDER BY o.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT o.*
    FROM orders o
    LEFT JOIN stores s ON lower(trim(s.name)) = lower(trim(o.location_name))
    WHERE o.status = 'pending'
      AND (o.agent_id IS NULL OR o.agent_id = p_agent_id)
      -- Exclude test-buyer orders from real agents' queues
      AND (v_test_buyer_id IS NULL OR o.user_id <> v_test_buyer_id)
      AND (
        o.agent_id = p_agent_id
        OR EXISTS (
          SELECT 1 FROM store_agents sa
          WHERE sa.store_id = s.id AND sa.agent_id = p_agent_id
        )
        OR (v_agent_zone IS NOT NULL AND o.service_zone = v_agent_zone)
        OR (v_agent_zone IS NULL AND o.service_zone IS NULL)
      )
    ORDER BY o.created_at DESC;
  END IF;
END;
$$;

-- ── 4. Verify config was populated correctly ──────────────────────────────────
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.test_account_config;
  IF v_count < 3 THEN
    RAISE WARNING 'test_account_config only has % row(s). One or more test users may not exist yet.', v_count;
  ELSE
    RAISE NOTICE 'Test account routing configured successfully (% accounts).', v_count;
  END IF;
END $$;
