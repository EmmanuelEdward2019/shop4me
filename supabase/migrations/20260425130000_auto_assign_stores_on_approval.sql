-- =============================================================================
-- Auto-assign stores to agent when their application is approved
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- Update handle_application_approval trigger to also set stores.assigned_agent_id
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_role app_role;
BEGIN
  -- ── APPROVAL ──────────────────────────────────────────────────────────────
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

    -- Auto-assign stores the agent selected in their application.
    -- Only claims stores that have no dedicated agent yet; admin can
    -- manually override any already-assigned store via AdminStores.
    IF NEW.market_knowledge IS NOT NULL AND array_length(NEW.market_knowledge, 1) > 0 THEN
      UPDATE public.stores
      SET assigned_agent_id = NEW.user_id
      WHERE id::text = ANY(NEW.market_knowledge)
        AND assigned_agent_id IS NULL;
    END IF;
  END IF;

  -- ── SUSPENSION / REJECTION ────────────────────────────────────────────────
  IF NEW.status IN ('suspended', 'rejected')
     AND OLD.status = 'approved'
     AND NEW.user_id IS NOT NULL
  THEN
    -- Revert role back to buyer
    UPDATE public.user_roles
    SET role = 'buyer'
    WHERE user_id = NEW.user_id AND role IN ('agent', 'rider');

    -- Release all stores this agent was assigned to
    UPDATE public.stores
    SET assigned_agent_id = NULL
    WHERE assigned_agent_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_application_status_change ON public.agent_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_application_approval();

-- =============================================================================
-- Also update the approve_application RPC to include store assignment
-- =============================================================================
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

  v_target_role := CASE
    WHEN v_app.role_type IN ('rider', 'delivery_rider') THEN 'rider'::app_role
    ELSE 'agent'::app_role
  END;

  -- Update application status
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

  -- Auto-assign stores the agent selected during their application
  IF v_app.market_knowledge IS NOT NULL AND array_length(v_app.market_knowledge, 1) > 0 THEN
    UPDATE stores
    SET assigned_agent_id = v_app.user_id
    WHERE id::text = ANY(v_app.market_knowledge)
      AND assigned_agent_id IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_application(uuid, text) TO authenticated;

-- =============================================================================
-- Backfill: assign stores for applications that are already approved
-- but whose stores still have no dedicated agent
-- =============================================================================
UPDATE public.stores s
SET assigned_agent_id = aa.user_id
FROM public.agent_applications aa
WHERE aa.status = 'approved'
  AND s.id::text = ANY(aa.market_knowledge)
  AND s.assigned_agent_id IS NULL;
