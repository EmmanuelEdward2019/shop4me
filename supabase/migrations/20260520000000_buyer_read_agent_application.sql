-- Allow buyers to read the agent_application of any agent assigned to one
-- of their orders. Without this, the buyer's "Your Agent" card on
-- OrderDetail stays stuck on "Waiting for Agent" even after assignment —
-- the page reads photo_url / market_knowledge / experience_description
-- from agent_applications, and the existing RLS only lets the agent (or
-- admin) read their own row.

DROP POLICY IF EXISTS "Buyers can view agent applications for their orders" ON public.agent_applications;
CREATE POLICY "Buyers can view agent applications for their orders"
ON public.agent_applications FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND user_id IN (
    SELECT agent_id FROM public.orders
    WHERE user_id = auth.uid() AND agent_id IS NOT NULL
  )
);
