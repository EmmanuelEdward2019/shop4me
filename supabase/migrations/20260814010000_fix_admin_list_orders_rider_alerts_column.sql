-- Hotfix: admin_list_orders referenced rider_alerts.requested_at, which does
-- not exist (the table's timestamp column is created_at). For an admin the
-- SECURITY DEFINER guard passes and the query body then raised
--   42703: column rider_alerts.requested_at does not exist
-- which the dashboard swallowed into an empty Orders tab. Only the LATERAL
-- rider lookup's ORDER BY changes (requested_at -> created_at).

CREATE OR REPLACE FUNCTION public.admin_list_orders(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id              uuid,
  created_at      timestamptz,
  status          text,
  location_name   text,
  location_type   text,
  estimated_total numeric,
  final_total     numeric,
  user_id         uuid,
  buyer_name      text,
  buyer_email     text,
  agent_id        uuid,
  agent_name      text,
  agent_email     text,
  rider_id        uuid,
  rider_name      text,
  rider_email     text,
  total_count     bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_status text := NULLIF(p_status, 'all');
  v_limit  int  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);  -- clamp 1..100
  v_offset int  := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      o.id, o.created_at, o.status::text AS status, o.location_name, o.location_type,
      o.estimated_total, o.final_total,
      o.user_id, bp.full_name AS buyer_name, bp.email AS buyer_email,
      o.agent_id, ap.full_name AS agent_name, ap.email AS agent_email,
      ra.rider_id, rp.full_name AS rider_name, rp.email AS rider_email
    FROM public.orders o
    LEFT JOIN public.profiles bp ON bp.user_id = o.user_id
    LEFT JOIN public.profiles ap ON ap.user_id = o.agent_id
    LEFT JOIN LATERAL (
      SELECT r.rider_id
      FROM public.rider_alerts r
      WHERE r.order_id = o.id AND r.rider_id IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 1
    ) ra ON true
    LEFT JOIN public.profiles rp ON rp.user_id = ra.rider_id
    WHERE (v_status IS NULL OR o.status::text = v_status)
      AND (
        v_search IS NULL
        OR o.location_name ILIKE '%' || v_search || '%'
        OR o.id::text      ILIKE '%' || v_search || '%'
        OR bp.full_name    ILIKE '%' || v_search || '%'
        OR bp.email        ILIKE '%' || v_search || '%'
      )
  )
  SELECT base.*, count(*) OVER() AS total_count
  FROM base
  ORDER BY base.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_orders(text, text, int, int) TO authenticated;
