-- Allow approved agents to update their own application info (excluding status fields)
CREATE POLICY "Approved agents can update their own application"
ON public.agent_applications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'approved')
WITH CHECK (auth.uid() = user_id AND status = 'approved');