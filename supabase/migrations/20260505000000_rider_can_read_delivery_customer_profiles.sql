-- Allow riders to read profiles and delivery_addresses for orders they are delivering.
-- Without this, AvailablePickups shows blank buyer name/phone/address even when
-- buyer_name is populated in rider_alerts, and any fallback profile join returns null.

-- 1. Riders can read the profile of any customer whose order they are assigned to deliver.
DROP POLICY IF EXISTS "Riders can view profiles of their delivery customers" ON public.profiles;
CREATE POLICY "Riders can view profiles of their delivery customers"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'rider') AND
  user_id IN (
    SELECT o.user_id FROM public.orders o
    INNER JOIN public.rider_alerts ra ON ra.order_id = o.id
    WHERE ra.rider_id = auth.uid()
  )
);

-- 2. Riders can read delivery addresses for their assigned orders.
DROP POLICY IF EXISTS "Riders can view delivery addresses for their deliveries" ON public.delivery_addresses;
CREATE POLICY "Riders can view delivery addresses for their deliveries"
ON public.delivery_addresses FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'rider') AND
  user_id IN (
    SELECT o.user_id FROM public.orders o
    INNER JOIN public.rider_alerts ra ON ra.order_id = o.id
    WHERE ra.rider_id = auth.uid()
  )
);

-- 3. Re-populate buyer_name / buyer_phone / delivery_address for existing rider_alerts
--    where these fields are NULL but the underlying order has customer data.
--    This backfills records created before the agent RLS fix was applied.
UPDATE public.rider_alerts ra
SET
  buyer_name    = COALESCE(p.full_name, ra.buyer_name),
  buyer_phone   = COALESCE(p.phone, ra.buyer_phone),
  delivery_address = COALESCE(
    (SELECT da.address_line1 || ', ' || da.city
     FROM public.delivery_addresses da
     WHERE da.id = o.delivery_address_id
     LIMIT 1),
    ra.delivery_address
  )
FROM public.orders o
LEFT JOIN public.profiles p ON p.user_id = o.user_id
WHERE ra.order_id = o.id
  AND (ra.buyer_name IS NULL OR ra.buyer_phone IS NULL OR ra.delivery_address IS NULL);
