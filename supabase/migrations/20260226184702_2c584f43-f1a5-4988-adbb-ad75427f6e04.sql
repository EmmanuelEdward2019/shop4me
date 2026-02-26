
-- Add timer columns to orders table for delivery time tracking
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS timer_started_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer DEFAULT NULL;
