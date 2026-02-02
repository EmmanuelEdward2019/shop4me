-- Add RLS policies for agents to view and manage orders

-- Agents can view pending orders (available for pickup)
CREATE POLICY "Agents can view pending orders"
ON public.orders
FOR SELECT
USING (
  public.has_role(auth.uid(), 'agent') 
  AND status = 'pending'
);

-- Agents can view orders assigned to them
CREATE POLICY "Agents can view their assigned orders"
ON public.orders
FOR SELECT
USING (
  public.has_role(auth.uid(), 'agent') 
  AND agent_id = auth.uid()
);

-- Agents can accept pending orders (update agent_id)
CREATE POLICY "Agents can accept pending orders"
ON public.orders
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'agent') 
  AND status = 'pending' 
  AND agent_id IS NULL
)
WITH CHECK (
  agent_id = auth.uid()
);

-- Agents can update status of their assigned orders
CREATE POLICY "Agents can update their assigned orders"
ON public.orders
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'agent') 
  AND agent_id = auth.uid()
)
WITH CHECK (
  agent_id = auth.uid()
);

-- Agents can view items from orders they are assigned to
CREATE POLICY "Agents can view items from their orders"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.agent_id = auth.uid()
  )
);

-- Agents can update items in orders they are assigned to
CREATE POLICY "Agents can update items in their orders"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.agent_id = auth.uid()
  )
);

-- Create agent_earnings table for tracking agent earnings
CREATE TABLE public.agent_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL, -- 'commission', 'bonus', 'tip'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on agent_earnings
ALTER TABLE public.agent_earnings ENABLE ROW LEVEL SECURITY;

-- Agents can view their own earnings
CREATE POLICY "Agents can view their own earnings"
ON public.agent_earnings
FOR SELECT
USING (auth.uid() = agent_id);

-- Create payments table for tracking all payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT,
  provider_response JSONB,
  payment_method TEXT, -- 'card', 'bank_transfer', 'wallet'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create payments for their orders
CREATE POLICY "Users can create payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add trigger for payments updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();