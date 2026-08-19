-- Stop agents reading customer phone numbers and email addresses.
--
-- 20260503000000 gave agents SELECT on the whole profiles ROW for any customer
-- whose order they hold, so they could read phone and email straight from the
-- API. The web agent order page went further and rendered the number as a
-- tel: link. Business is meant to stay inside the app, so an agent must never
-- receive a customer's direct contact details.
--
-- Postgres RLS is row-level and cannot hide a single column, and Supabase runs
-- every signed-in user as the same `authenticated` role, so a column GRANT
-- would also stop people reading their OWN phone. The fix is therefore to take
-- the broad row policy away and hand agents a function that returns only the
-- columns they legitimately need.
--
-- NOT CHANGED, deliberately:
--   * Riders still read customer phone (20260505000000). They need it at the
--     door, and the outside-the-app concern does not apply to them.
--   * Agents still read the RIDER's phone via rider_alerts, so agent-to-rider
--     calling keeps working.
--   * Agents still read delivery_addresses for their orders -- they brief the
--     rider from it.
--   * The user's own profile, and the admin policy, are untouched.

DROP POLICY IF EXISTS "Agents can view profiles of their order customers" ON public.profiles;

-- Names only, and only for customers of orders this agent actually holds.
CREATE OR REPLACE FUNCTION public.agent_customer_names(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.user_id = ANY(p_user_ids)
    AND public.has_role(auth.uid(), 'agent')
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.user_id = p.user_id
        AND o.agent_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.agent_customer_names(uuid[]) FROM public;
REVOKE ALL ON FUNCTION public.agent_customer_names(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_customer_names(uuid[]) TO authenticated;
