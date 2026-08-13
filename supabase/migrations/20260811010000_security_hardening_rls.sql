-- Security hardening (from codebase audit). Locks down policies that were
-- unintentionally open. All three targets are written ONLY by SECURITY DEFINER
-- triggers / service-role edge functions (which bypass RLS), and are never
-- written from client code — so tightening them cannot break any real flow.

-- 1. rider_earnings — writes were open to EVERY authenticated user:
--       FOR INSERT WITH CHECK (true);  FOR UPDATE USING (true);
--    (no TO clause → applies to all roles). A rider could fabricate/inflate
--    their own earnings and then withdraw real money. The
--    create_rider_earning_on_completion() trigger is SECURITY DEFINER and
--    bypasses RLS, so no permissive user policy is needed.
DROP POLICY IF EXISTS "Service role can insert earnings" ON public.rider_earnings;
DROP POLICY IF EXISTS "Service role can update earnings" ON public.rider_earnings;

CREATE POLICY "Admins can insert rider earnings"
  ON public.rider_earnings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rider earnings"
  ON public.rider_earnings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. payments — "Users can create payments" let any user INSERT arbitrary
--    payment rows (e.g. fake status='success'), polluting admin revenue and
--    reconciliation. Payments are created only by the payment edge functions
--    (service role), so remove the client insert policy.
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;

-- 3. agent-documents storage — "auth_read_all_agent_docs" let ANY authenticated
--    user read EVERY file in the bucket, exposing agents' ID / licence
--    documents (PII). The owner ("Users can view their own documents") and
--    admin ("Admins can view all agent documents") read policies remain, so
--    admins can still review applications.
DROP POLICY IF EXISTS "auth_read_all_agent_docs" ON storage.objects;
