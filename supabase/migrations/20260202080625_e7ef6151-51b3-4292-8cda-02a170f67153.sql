-- Create payment_cards table for saved card authorizations
CREATE TABLE public.payment_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  authorization_code TEXT NOT NULL,
  card_type TEXT NOT NULL,
  last4 TEXT NOT NULL,
  exp_month TEXT NOT NULL,
  exp_year TEXT NOT NULL,
  bank TEXT,
  brand TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

-- Users can only view their own cards
CREATE POLICY "Users can view their own payment cards"
ON public.payment_cards
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own cards
CREATE POLICY "Users can insert their own payment cards"
ON public.payment_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cards
CREATE POLICY "Users can update their own payment cards"
ON public.payment_cards
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own cards
CREATE POLICY "Users can delete their own payment cards"
ON public.payment_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_cards_updated_at
BEFORE UPDATE ON public.payment_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_payment_cards_user_id ON public.payment_cards(user_id);