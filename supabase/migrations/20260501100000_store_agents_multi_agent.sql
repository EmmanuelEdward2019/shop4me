-- =============================================================================
-- Multi-agent store support: replace stores.assigned_agent_id (single) with
-- store_agents junction table (many-to-many).
--
-- What this migration does:
--  1. Creates store_agents(store_id, agent_id) with RLS
--  2. Migrates existing stores.assigned_agent_id data into store_agents
--  3. Updates handle_application_approval trigger to INSERT INTO store_agents
--  4. Updates approve_application RPC to INSERT INTO store_agents
--  5. Updates get_available_orders_nearby to JOIN store_agents
--
-- NOTE: stores.assigned_agent_id column is kept (backward-compat) but is no
-- longer written by app code.  It can be dropped in a later migration.
--
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- ── 1. Create store_agents junction table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_agents (
  store_id   uuid        NOT NULL REFERENCES public.stores(id)  ON DELETE CASCADE,
  agent_id   uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, agent_id)
);

ALTER TABLE public.store_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read store_agents" ON public.store_agents;
CREATE POLICY "Authenticated users can read store_agents"
  ON public.store_agents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage store_agents" ON public.store_agents;
CREATE POLICY "Admins can manage store_agents"
  ON public.store_agents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 2. Migrate existing single-agent assignments ───────────────────────────────

INSERT INTO public.store_agents (store_id, agent_id)
SELECT id, assigned_agent_id
FROM   public.stores
WHERE  assigned_agent_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── 3. Recreate handle_application_approval ────────────────────────────────────
--      Replaces UPDATE stores SET assigned_agent_id with INSERT INTO store_agents

CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_role app_role;
BEGIN
  -- ── APPROVAL ────────────────────────────────────────────────────────────────
  IF NEW.status = 'approved'
     AND (OLD.status IS NULL OR OLD.status <> 'approved')
     AND NEW.user_id IS NOT NULL
  THEN
    -- Map role_type → app_role
    IF NEW.role_type IN ('rider', 'delivery_rider') THEN
      v_new_role := 'rider'::app_role;
    ELSE
      v_new_role := 'agent'::app_role;
    END IF;

    -- Update existing buyer row → new role, or insert if missing
    UPDATE public.user_roles
    SET role = v_new_role
    WHERE user_id = NEW.user_id AND role = 'buyer';

    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, v_new_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Assign the agent to all selected stores (multi-agent safe INSERT … SELECT)
    IF NEW.market_knowledge IS NOT NULL AND array_length(NEW.market_knowledge, 1) > 0 THEN
      INSERT INTO public.store_agents (store_id, agent_id)
      SELECT id, NEW.user_id
      FROM   public.stores
      WHERE  id::text = ANY(NEW.market_knowledge)
      ON CONFLICT (store_id, agent_id) DO NOTHING;
    END IF;
  END IF;

  -- ── SUSPENSION / REJECTION ──────────────────────────────────────────────────
  IF NEW.status IN ('suspended', 'rejected')
     AND OLD.status = 'approved'
     AND NEW.user_id IS NOT NULL
  THEN
    -- Revert role back to buyer
    UPDATE public.user_roles
    SET role = 'buyer'
    WHERE user_id = NEW.user_id AND role IN ('agent', 'rider');

    -- Release all store_agents rows for this agent
    DELETE FROM public.store_agents WHERE agent_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_application_status_change ON public.agent_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_application_approval();

-- ── 4. Recreate approve_application RPC ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_application(
  p_application_id uuid,
  p_admin_notes    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app         record;
  v_target_role app_role;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO v_app FROM agent_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  v_target_role := CASE
    WHEN v_app.role_type IN ('rider', 'delivery_rider') THEN 'rider'::app_role
    ELSE 'agent'::app_role
  END;

  -- Update application status (trigger fires as a safety net too)
  UPDATE agent_applications
  SET status      = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_application_id;

  -- Update role: buyer → agent/rider
  UPDATE user_roles
  SET role = v_target_role
  WHERE user_id = v_app.user_id AND role = 'buyer';

  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_app.user_id, v_target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Assign agent to all chosen stores (multi-agent safe INSERT … SELECT)
  IF v_app.market_knowledge IS NOT NULL AND array_length(v_app.market_knowledge, 1) > 0 THEN
    INSERT INTO store_agents (store_id, agent_id)
    SELECT id, v_app.user_id
    FROM   stores
    WHERE  id::text = ANY(v_app.market_knowledge)
    ON CONFLICT (store_id, agent_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_application(uuid, text) TO authenticated;

-- ── 5. Update get_available_orders_nearby to use store_agents ──────────────────

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
BEGIN
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

-- ── 6. Backfill: ensure all currently approved agents are in store_agents ──────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT user_id, market_knowledge
    FROM public.agent_applications
    WHERE status = 'approved'
      AND market_knowledge IS NOT NULL
      AND array_length(market_knowledge, 1) > 0
  LOOP
    INSERT INTO public.store_agents (store_id, agent_id)
    SELECT id, r.user_id
    FROM   public.stores
    WHERE  id::text = ANY(r.market_knowledge)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
