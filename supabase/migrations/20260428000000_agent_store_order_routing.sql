-- =============================================================================
-- Update get_available_orders_nearby to include:
--   1. Orders pre-assigned to this agent (agent_id = p_agent_id)
--   2. Orders for stores where this agent is the dedicated agent
--      (stores.assigned_agent_id = p_agent_id)
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================
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
        -- Dedicated store agent
        s.assigned_agent_id = p_agent_id
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
        OR s.assigned_agent_id = p_agent_id
        OR (v_agent_zone IS NOT NULL AND o.service_zone = v_agent_zone)
        OR (v_agent_zone IS NULL AND o.service_zone IS NULL)
      )
    ORDER BY o.created_at DESC;
  END IF;
END;
$$;
