-- Allow agents to read profiles and delivery_addresses of customers whose orders they manage.
-- Without this, AgentOrderDetail shows an empty Customer Details card because RLS blocks
-- the agent from fetching another user's profile row.

-- 1. Profiles: agents can read the profile of any customer whose order they are assigned to.
DROP POLICY IF EXISTS "Agents can view profiles of their order customers" ON public.profiles;
CREATE POLICY "Agents can view profiles of their order customers"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') AND
  user_id IN (SELECT user_id FROM public.orders WHERE agent_id = auth.uid())
);

-- 2. Delivery addresses: agents can read delivery addresses that belong to their order customers.
--    PostgREST evaluates RLS on joined tables, so without this the joined delivery_addresses
--    in the orders query returns null for agents.
DROP POLICY IF EXISTS "Agents can view delivery addresses for their orders" ON public.delivery_addresses;
CREATE POLICY "Agents can view delivery addresses for their orders"
ON public.delivery_addresses FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') AND
  user_id IN (SELECT user_id FROM public.orders WHERE agent_id = auth.uid())
);
