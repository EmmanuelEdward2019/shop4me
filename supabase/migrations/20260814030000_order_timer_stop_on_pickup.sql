-- Freeze the agent shopping timer the moment the rider picks the order up.
-- Previously the timer only froze at delivered/cancelled, so it counted up
-- indefinitely through the whole delivery leg. We capture the pickup time on
-- the order (timer_stopped_at) via the existing pickup trigger, and the app
-- freezes OrderTimer at that instant when status = 'in_transit'.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS timer_stopped_at timestamptz;

-- Extend the existing pickup trigger function to stamp timer_stopped_at.
CREATE OR REPLACE FUNCTION public.set_order_in_transit_on_pickup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when order_picked_up_at transitions from NULL to a timestamp
  IF OLD.order_picked_up_at IS NULL AND NEW.order_picked_up_at IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'in_transit',
        timer_stopped_at = COALESCE(timer_stopped_at, NEW.order_picked_up_at),
        updated_at = now()
    WHERE id = NEW.order_id
      AND status NOT IN ('delivered', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill orders that were already picked up so their timers freeze correctly.
UPDATE public.orders o
SET timer_stopped_at = ra.order_picked_up_at
FROM public.rider_alerts ra
WHERE ra.order_id = o.id
  AND ra.order_picked_up_at IS NOT NULL
  AND o.timer_stopped_at IS NULL;
