-- =============================================================================
-- User suspension support for admin dashboard.
-- Adds is_suspended flag to profiles + RPC for admins to toggle it.
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Admin-only RPC to suspend or unsuspend any user
CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(
  p_user_id  uuid,
  p_suspended boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;

  UPDATE public.profiles
  SET is_suspended = p_suspended
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) TO authenticated;
