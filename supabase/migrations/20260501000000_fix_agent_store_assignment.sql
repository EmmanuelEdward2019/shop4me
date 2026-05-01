-- =============================================================================
-- Fix: Ensure agent store assignment fires on every approval.
--
-- Root cause: AND assigned_agent_id IS NULL condition blocked assignment
-- when a store was previously claimed by any agent (even suspended/rejected
-- ones that weren't properly released). Admin approval is an explicit
-- decision, so the approved agent's stores should always be assigned.
--
-- Also ensures the latest versions of both the trigger function and the
-- approve_application RPC are in place (in case earlier migrations
-- were not applied to this Supabase project).
--
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- ── 1. Recreate handle_application_approval with unconditional store assignment ─

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

    -- Assign ALL stores the agent selected, overwriting any prior assignment.
    -- Admin approval is an explicit decision; admin can resolve conflicts via
    -- AdminStores if two agents both selected the same store.
    IF NEW.market_knowledge IS NOT NULL AND array_length(NEW.market_knowledge, 1) > 0 THEN
      UPDATE public.stores
      SET assigned_agent_id = NEW.user_id
      WHERE id::text = ANY(NEW.market_knowledge);
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

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_application_status_change ON public.agent_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_application_approval();

-- ── 2. Recreate approve_application RPC with unconditional store assignment ──

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

  -- Update application status (this also fires the trigger above as a safety net)
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

  -- Assign the agent's chosen stores unconditionally
  IF v_app.market_knowledge IS NOT NULL AND array_length(v_app.market_knowledge, 1) > 0 THEN
    UPDATE stores
    SET assigned_agent_id = v_app.user_id
    WHERE id::text = ANY(v_app.market_knowledge);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_application(uuid, text) TO authenticated;

-- ── 3. Backfill: assign stores for all currently approved agents ──────────────

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
    UPDATE public.stores
    SET assigned_agent_id = r.user_id
    WHERE id::text = ANY(r.market_knowledge);
  END LOOP;
END;
$$;
