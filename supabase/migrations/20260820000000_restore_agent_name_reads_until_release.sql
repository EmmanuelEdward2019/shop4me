-- Restore agents' ability to read their customers' profile ROW, temporarily.
--
-- WHY THIS STEPS BACK FROM 20260819030000
--
-- Dropping that policy closed the contact-detail hole, but it also broke the
-- shipped app. Build 14's agent screens read names with
--     from('profiles').select('user_id, full_name').in('user_id', ids)
-- so with no policy they get zero rows and every order renders as
-- "Customer: Unknown Buyer". Agents in the field cannot tell who they are
-- shopping for. That is a functional regression, not a cosmetic one.
--
-- The obvious alternatives do not work:
--   * A column GRANT is per-ROLE, and Supabase runs every signed-in user as
--     `authenticated`, so revoking phone would also stop people reading their
--     OWN number.
--   * Moving phone out of profiles breaks build-14 RIDERS, who read
--     profiles.phone directly and genuinely need it at the door.
-- Masking phone per-caller needs profiles to become a view over a renamed base
-- table, with an INSTEAD OF trigger so profile edits still write. That is the
-- correct permanent fix, but it is a core-table refactor and is not something
-- to apply untested to a live database.
--
-- WHAT IS AND IS NOT EXPOSED WHILE THIS STANDS
--
-- The reported leak -- the web agent order page rendering the customer's
-- number as a tel: link, and the messages page pulling their email -- is FIXED
-- and deployed. Those pages now use agent_customer_names and request no
-- contact columns at all. No screen in either app shows an agent a customer's
-- phone or email.
--
-- What comes back is only the API-level possibility: an agent who crafts their
-- own request could ask for the phone column. That is a deliberate act, not
-- something the product hands them.
--
-- REMOVE THIS ONCE THE NEXT MOBILE BUILD IS LIVE IN BOTH STORES. The new
-- clients already read names through agent_customer_names, so dropping this
-- policy again then costs nothing.

DROP POLICY IF EXISTS "Agents can view profiles of their order customers" ON public.profiles;
CREATE POLICY "Agents can view profiles of their order customers"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') AND
  user_id IN (SELECT user_id FROM public.orders WHERE agent_id = auth.uid())
);
