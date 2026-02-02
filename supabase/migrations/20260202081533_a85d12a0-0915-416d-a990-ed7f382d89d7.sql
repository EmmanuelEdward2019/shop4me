-- Add nickname column to payment_cards
ALTER TABLE public.payment_cards 
ADD COLUMN nickname TEXT;