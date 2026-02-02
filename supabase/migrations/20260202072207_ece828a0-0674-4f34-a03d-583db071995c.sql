-- Create table for agent reviews/ratings from buyers
CREATE TABLE public.agent_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- Buyers can create reviews for their completed orders
CREATE POLICY "Buyers can create reviews for their delivered orders"
ON public.agent_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = agent_reviews.order_id 
    AND orders.user_id = auth.uid()
    AND orders.status = 'delivered'
  )
);

-- Buyers can view their own reviews
CREATE POLICY "Buyers can view their own reviews"
ON public.agent_reviews
FOR SELECT
USING (auth.uid() = buyer_id);

-- Agents can view reviews about them
CREATE POLICY "Agents can view their reviews"
ON public.agent_reviews
FOR SELECT
USING (auth.uid() = agent_id);

-- Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.agent_reviews
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view reviews for display purposes (aggregate ratings)
CREATE POLICY "Anyone can view reviews for agents"
ON public.agent_reviews
FOR SELECT
USING (true);

-- Buyers can update their own review within 7 days
CREATE POLICY "Buyers can update their reviews"
ON public.agent_reviews
FOR UPDATE
USING (
  auth.uid() = buyer_id AND
  created_at > now() - interval '7 days'
);

-- Add trigger for updated_at
CREATE TRIGGER update_agent_reviews_updated_at
BEFORE UPDATE ON public.agent_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for agent lookup
CREATE INDEX idx_agent_reviews_agent_id ON public.agent_reviews(agent_id);
CREATE INDEX idx_agent_reviews_order_id ON public.agent_reviews(order_id);