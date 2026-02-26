
-- Create rider_alerts table for agent-to-rider notifications
CREATE TABLE public.rider_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  rider_id uuid DEFAULT NULL,
  store_location_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  order_packed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can create rider alerts"
  ON public.rider_alerts FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their rider alerts"
  ON public.rider_alerts FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Riders can view available alerts"
  ON public.rider_alerts FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'rider') 
    OR agent_id = auth.uid() 
    OR rider_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Riders can accept alerts"
  ON public.rider_alerts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'rider') AND (rider_id IS NULL OR rider_id = auth.uid()));

CREATE INDEX idx_rider_alerts_order_id ON public.rider_alerts(order_id);
CREATE INDEX idx_rider_alerts_status ON public.rider_alerts(status);
CREATE INDEX idx_rider_alerts_rider_id ON public.rider_alerts(rider_id);
