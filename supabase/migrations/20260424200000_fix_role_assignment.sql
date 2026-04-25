-- =============================================================================
-- FIX: Role assignment for agents and riders
-- RUN THIS IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- 1. Fix handle_new_user trigger to assign the correct role at signup
--    (previously it always assigned 'buyer' regardless of metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role;
  v_meta_role TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Read desired role from signup metadata (set by AgentApplication form)
  v_meta_role := NEW.raw_user_meta_data->>'role';

  IF v_meta_role = 'delivery_rider' THEN
    v_role := 'rider'::app_role;
  ELSIF v_meta_role IN ('shopping_agent', 'both') THEN
    v_role := 'agent'::app_role;
  ELSE
    v_role := 'buyer'::app_role;
  END IF;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix handle_application_approval trigger
--    Bug was: role_type = 'rider' — but form submits 'delivery_rider'
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_role app_role;
BEGIN
  -- Only act when status changes TO 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') AND NEW.user_id IS NOT NULL THEN
    -- Map role_type → app_role
    IF NEW.role_type IN ('rider', 'delivery_rider') THEN
      v_new_role := 'rider'::app_role;
    ELSE
      v_new_role := 'agent'::app_role;
    END IF;

    -- Update the existing buyer row, or insert if missing
    UPDATE public.user_roles
    SET role = v_new_role
    WHERE user_id = NEW.user_id AND role = 'buyer';

    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, v_new_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  -- Revert to buyer on suspend/reject
  IF NEW.status IN ('suspended', 'rejected') AND OLD.status = 'approved' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.user_roles
    SET role = 'buyer'
    WHERE user_id = NEW.user_id AND role IN ('agent', 'rider');
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_application_status_change ON public.agent_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_application_approval();

-- 3. Create approve_application RPC (atomic, SECURITY DEFINER, bypasses RLS)
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO v_app FROM agent_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Map role_type → app_role (fix: check delivery_rider not rider)
  v_target_role := CASE
    WHEN v_app.role_type IN ('rider', 'delivery_rider') THEN 'rider'::app_role
    ELSE 'agent'::app_role
  END;

  UPDATE agent_applications
  SET status      = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_application_id;

  -- Update buyer row → new role; insert if no buyer row exists
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

-- 4. One-time backfill: fix any approved applicants still stuck as buyer
UPDATE public.user_roles ur
SET role = CASE
  WHEN aa.role_type IN ('rider', 'delivery_rider') THEN 'rider'::app_role
  ELSE 'agent'::app_role
END
FROM public.agent_applications aa
WHERE aa.user_id = ur.user_id
  AND aa.status = 'approved'
  AND ur.role = 'buyer';
