-- ============================================================================
-- Nearest-agent live dispatch (Uber/Bolt style).
--   * Agents report live GPS + an availability flag (agent_live_locations).
--   * When an order is placed, it is OFFERED to the nearest available agent to
--     the store (order_offers). If they don't accept before it expires, it
--     cascades to the next-nearest agent, and so on.
--   * Accepting assigns the order to that agent; the existing store/zone "pull"
--     list remains as a fallback when no one is reporting a live location.
-- Distance uses PostGIS on the store coordinates already stored on orders.
-- ============================================================================

-- ── Agent live location + availability ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_live_locations (
  agent_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude     numeric,
  longitude    numeric,
  is_available boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_live_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent sees own live location" ON public.agent_live_locations;
CREATE POLICY "Agent sees own live location"
  ON public.agent_live_locations FOR SELECT
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.report_agent_location(p_lat numeric, p_lng numeric, p_available boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.agent_live_locations (agent_id, latitude, longitude, is_available, updated_at)
  VALUES (auth.uid(), p_lat, p_lng, p_available, now())
  ON CONFLICT (agent_id) DO UPDATE
    SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        is_available = EXCLUDED.is_available, updated_at = now();
END; $$;
GRANT EXECUTE ON FUNCTION public.report_agent_location(numeric, numeric, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_agent_availability(p_available boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.agent_live_locations (agent_id, is_available, updated_at)
  VALUES (auth.uid(), p_available, now())
  ON CONFLICT (agent_id) DO UPDATE SET is_available = EXCLUDED.is_available, updated_at = now();
END; $$;
GRANT EXECUTE ON FUNCTION public.set_agent_availability(boolean) TO authenticated;

-- ── Offers ledger ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_offers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  agent_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'offered', -- offered | accepted | declined | expired
  distance_km  numeric,
  offered_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS order_offers_agent_status_idx ON public.order_offers (agent_id, status);
CREATE INDEX IF NOT EXISTS order_offers_order_status_idx ON public.order_offers (order_id, status);
CREATE INDEX IF NOT EXISTS order_offers_expiry_idx       ON public.order_offers (status, expires_at);

ALTER TABLE public.order_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent sees own offers" ON public.order_offers;
CREATE POLICY "Agent sees own offers"
  ON public.order_offers FOR SELECT
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Realtime so an agent's app is notified the instant an offer arrives.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_offers;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Dispatch to the nearest available agent ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_next_agent(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_timeout_seconds int := 60;   -- how long each agent has to respond
  v_status   text;
  v_lat      numeric;
  v_lng      numeric;
  v_agent    uuid;
  v_dist_km  numeric;
BEGIN
  SELECT status, store_latitude, store_longitude
  INTO v_status, v_lat, v_lng
  FROM public.orders WHERE id = p_order_id;

  IF v_status IS DISTINCT FROM 'pending' THEN RETURN NULL; END IF;  -- only dispatch unassigned orders

  -- Fall back to the store's coordinates (by name) when the order lacks them.
  IF v_lat IS NULL OR v_lng IS NULL THEN
    SELECT s.latitude, s.longitude INTO v_lat, v_lng
    FROM public.orders o
    JOIN public.stores s ON lower(trim(s.name)) = lower(trim(o.location_name))
    WHERE o.id = p_order_id LIMIT 1;
  END IF;

  IF v_lat IS NULL OR v_lng IS NULL THEN RETURN NULL; END IF;  -- no coords → rely on pull list

  SELECT al.agent_id,
         ST_Distance(ST_MakePoint(v_lng, v_lat)::geography,
                     ST_MakePoint(al.longitude, al.latitude)::geography) / 1000.0
  INTO v_agent, v_dist_km
  FROM public.agent_live_locations al
  WHERE al.is_available = true
    AND al.latitude IS NOT NULL AND al.longitude IS NOT NULL
    AND al.updated_at > now() - interval '5 minutes'
    AND EXISTS (SELECT 1 FROM public.agent_applications aa
                WHERE aa.user_id = al.agent_id AND aa.status = 'approved')
    -- never offer the same order to an agent twice
    AND NOT EXISTS (SELECT 1 FROM public.order_offers oo
                    WHERE oo.order_id = p_order_id AND oo.agent_id = al.agent_id)
    -- one live offer at a time per agent
    AND NOT EXISTS (SELECT 1 FROM public.order_offers busy
                    WHERE busy.agent_id = al.agent_id AND busy.status = 'offered'
                      AND busy.expires_at > now())
  ORDER BY ST_Distance(ST_MakePoint(v_lng, v_lat)::geography,
                       ST_MakePoint(al.longitude, al.latitude)::geography) ASC
  LIMIT 1;

  IF v_agent IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.order_offers (order_id, agent_id, status, distance_km, offered_at, expires_at)
  VALUES (p_order_id, v_agent, 'offered', round(COALESCE(v_dist_km, 0)::numeric, 2),
          now(), now() + make_interval(secs => v_timeout_seconds));

  RETURN v_agent;
END; $$;

-- ── Agent responds ──────────────────────────────────────────────────────────
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

  UPDATE public.orders
  SET agent_id = v_offer.agent_id, status = 'accepted', updated_at = now()
  WHERE id = v_offer.order_id AND status = 'pending' AND (agent_id IS NULL OR agent_id = v_offer.agent_id);

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

CREATE OR REPLACE FUNCTION public.decline_order_offer(p_offer_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offer public.order_offers;
BEGIN
  SELECT * INTO v_offer FROM public.order_offers WHERE id = p_offer_id FOR UPDATE;
  IF v_offer.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Offer not found'); END IF;
  IF v_offer.agent_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not your offer'); END IF;
  IF v_offer.status = 'offered' THEN
    UPDATE public.order_offers SET status = 'declined', responded_at = now() WHERE id = p_offer_id;
    PERFORM public.dispatch_next_agent(v_offer.order_id);
  END IF;
  RETURN json_build_object('success', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.decline_order_offer(uuid) TO authenticated;

-- Current live offer for the signed-in agent (fallback to Realtime).
CREATE OR REPLACE FUNCTION public.get_my_active_offer()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v json;
BEGIN
  SELECT json_build_object(
    'offer_id', oo.id, 'order_id', oo.order_id, 'distance_km', oo.distance_km,
    'expires_at', oo.expires_at, 'location_name', o.location_name,
    'estimated_total', o.estimated_total
  ) INTO v
  FROM public.order_offers oo
  JOIN public.orders o ON o.id = oo.order_id
  WHERE oo.agent_id = auth.uid() AND oo.status = 'offered' AND oo.expires_at > now()
    AND o.status = 'pending'
  ORDER BY oo.offered_at DESC LIMIT 1;
  RETURN COALESCE(v, json_build_object('offer_id', null));
END; $$;
GRANT EXECUTE ON FUNCTION public.get_my_active_offer() TO authenticated;

-- ── Cascade: expire timed-out offers and re-dispatch ────────────────────────
CREATE OR REPLACE FUNCTION public.process_expired_offers()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count int := 0;
BEGIN
  FOR r IN
    SELECT id, order_id FROM public.order_offers
    WHERE status = 'offered' AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.order_offers SET status = 'expired' WHERE id = r.id;
    PERFORM public.dispatch_next_agent(r.order_id);  -- next-nearest (no-op if taken)
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- ── Offer the first agent when an order is placed ───────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_on_order_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    BEGIN
      PERFORM public.dispatch_next_agent(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- dispatch must never block order creation
    END;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_dispatch_on_insert ON public.orders;
CREATE TRIGGER trg_dispatch_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_on_order_insert();

-- ── Cascade timer via pg_cron (every minute; best-effort) ───────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('process-order-offers')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-order-offers');
    PERFORM cron.schedule('process-order-offers', '* * * * *', 'SELECT public.process_expired_offers();');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;
