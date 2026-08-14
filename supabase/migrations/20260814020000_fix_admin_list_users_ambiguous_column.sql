-- Hotfix: admin_list_users failed for every admin with
--   42702: column reference "full_name" is ambiguous
-- The RETURNS TABLE OUT columns (full_name, email, phone, role, ...) are
-- PL/pgSQL variables, so the unqualified references in the `filtered` CTE's
-- WHERE clause were ambiguous against the `ranked` CTE's columns. Qualify them
-- with the `ranked.` alias. No behavioural change otherwise.

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_role   text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  user_id      uuid,
  full_name    text,
  email        text,
  phone        text,
  is_suspended boolean,
  created_at   timestamptz,
  role         text,
  total_count  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_role   text := NULLIF(p_role, 'all');
  v_limit  int  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_offset int  := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      p.user_id,
      p.full_name,
      p.email,
      p.phone,
      COALESCE(p.is_suspended, false) AS is_suspended,
      p.created_at,
      COALESCE(
        (SELECT ur.role::text FROM public.user_roles ur
          WHERE ur.user_id = p.user_id ORDER BY ur.role LIMIT 1),
        'buyer'
      ) AS role
    FROM public.profiles p
  ),
  filtered AS (
    SELECT * FROM ranked
    WHERE (
      v_search IS NULL
      OR ranked.full_name ILIKE '%' || v_search || '%'
      OR ranked.email     ILIKE '%' || v_search || '%'
      OR ranked.phone     ILIKE '%' || v_search || '%'
    )
    AND (v_role IS NULL OR ranked.role = v_role)
  )
  SELECT filtered.*, count(*) OVER() AS total_count
  FROM filtered
  ORDER BY filtered.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, int, int) TO authenticated;
