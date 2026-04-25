-- Atomic application approval RPC
-- Bypasses RLS quirks by running as SECURITY DEFINER. Updates both the
-- application status and the user_roles table in a single call.

CREATE OR REPLACE FUNCTION public.approve_application(
  p_application_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app record;
  v_target_role app_role;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  -- Load the application
  SELECT * INTO v_app FROM agent_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Determine target role from role_type
  v_target_role := CASE WHEN v_app.role_type = 'rider' THEN 'rider'::app_role ELSE 'agent'::app_role END;

  -- Update application status
  UPDATE agent_applications
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_application_id;

  -- Replace buyer role with target role; if no buyer row, insert directly
  UPDATE user_roles
  SET role = v_target_role
  WHERE user_id = v_app.user_id AND role = 'buyer';

  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_app.user_id, v_target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_application(uuid, text) TO authenticated;

-- One-time fix for existing approved applicants whose user_roles row is still 'buyer'
UPDATE public.user_roles ur
SET role = CASE WHEN aa.role_type = 'rider' THEN 'rider'::app_role ELSE 'agent'::app_role END
FROM public.agent_applications aa
WHERE aa.user_id = ur.user_id
  AND aa.status = 'approved'
  AND ur.role = 'buyer';
