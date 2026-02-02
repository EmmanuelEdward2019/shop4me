-- Create table for agent live locations
CREATE TABLE public.agent_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(10, 2),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.agent_locations ENABLE ROW LEVEL SECURITY;

-- Agents can insert/update their location for their orders
CREATE POLICY "Agents can upsert their location"
ON public.agent_locations
FOR ALL
USING (
  auth.uid() = agent_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = agent_locations.order_id 
    AND orders.agent_id = auth.uid()
    AND orders.status IN ('shopping', 'in_transit')
  )
)
WITH CHECK (
  auth.uid() = agent_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = agent_locations.order_id 
    AND orders.agent_id = auth.uid()
    AND orders.status IN ('shopping', 'in_transit')
  )
);

-- Buyers can view location for their orders
CREATE POLICY "Buyers can view location for their orders"
ON public.agent_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = agent_locations.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
ON public.agent_locations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient lookups
CREATE INDEX idx_agent_locations_order_id ON public.agent_locations(order_id);
CREATE INDEX idx_agent_locations_agent_id ON public.agent_locations(agent_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_locations;