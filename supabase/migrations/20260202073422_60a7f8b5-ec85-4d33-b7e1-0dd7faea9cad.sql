-- Create table for delivery status updates (stops, delays, etc.)
CREATE TABLE public.delivery_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('stop', 'delay', 'note', 'arrived_nearby')),
  message TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_updates ENABLE ROW LEVEL SECURITY;

-- Agents can create updates for their orders
CREATE POLICY "Agents can create delivery updates"
ON public.delivery_updates
FOR INSERT
WITH CHECK (
  auth.uid() = agent_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = delivery_updates.order_id 
    AND orders.agent_id = auth.uid()
  )
);

-- Agents can view their own updates
CREATE POLICY "Agents can view their updates"
ON public.delivery_updates
FOR SELECT
USING (auth.uid() = agent_id);

-- Buyers can view updates for their orders
CREATE POLICY "Buyers can view updates for their orders"
ON public.delivery_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = delivery_updates.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_delivery_updates_order_id ON public.delivery_updates(order_id);
CREATE INDEX idx_delivery_updates_created_at ON public.delivery_updates(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_updates;

-- Add column to track if proximity notification was sent
ALTER TABLE public.agent_locations 
ADD COLUMN IF NOT EXISTS proximity_notified BOOLEAN DEFAULT false;