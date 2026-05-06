-- When a rider marks an order as picked up (order_picked_up_at becomes non-null),
-- automatically update the parent order's status to 'in_transit'.
-- This runs as SECURITY DEFINER so it bypasses RLS — the rider's session cannot
-- directly update orders (only their own rider_alerts), but the trigger can.

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
        updated_at = now()
    WHERE id = NEW.order_id
      AND status NOT IN ('delivered', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_rider_picked_up ON public.rider_alerts;
CREATE TRIGGER on_rider_picked_up
  AFTER UPDATE OF order_picked_up_at ON public.rider_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_in_transit_on_pickup();
