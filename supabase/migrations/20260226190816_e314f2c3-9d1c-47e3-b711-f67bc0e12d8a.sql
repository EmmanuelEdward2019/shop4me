
-- Add store coordinates and rider arrival tracking to rider_alerts
ALTER TABLE public.rider_alerts
  ADD COLUMN IF NOT EXISTS store_latitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS store_longitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rider_arrived_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS order_picked_up_at timestamp with time zone DEFAULT NULL;
