-- Nearby-rider targeting for pickup alerts.
--
-- Stores each rider's last-known GPS so an escalated pickup can be PUSHED to
-- riders near the store first, instead of every rider on the platform.
--
-- Safety: this is purely additive. The rider_alerts SELECT policy already lets
-- ANY rider see a pending (unassigned) pickup, so nearby-only pushing never
-- hides an order — every rider can still open Available Pickups and accept it.
-- And until the rider app starts reporting locations, this table is empty, so
-- notify-rider falls back to broadcasting to all riders exactly as it does now.

CREATE TABLE IF NOT EXISTS public.rider_locations (
  rider_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude   double precision NOT NULL,
  longitude  double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

-- A rider reads/writes only their own location row.
DROP POLICY IF EXISTS "Riders manage their own location" ON public.rider_locations;
CREATE POLICY "Riders manage their own location"
ON public.rider_locations FOR ALL
TO authenticated
USING (rider_id = auth.uid())
WITH CHECK (rider_id = auth.uid());

-- Admins can view rider locations (ops visibility).
DROP POLICY IF EXISTS "Admins can view rider locations" ON public.rider_locations;
CREATE POLICY "Admins can view rider locations"
ON public.rider_locations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_rider_locations_updated_at
  ON public.rider_locations (updated_at);

-- Record how each pickup alert was dispatched (nearby-first vs broadcast).
ALTER TABLE public.rider_alerts
  ADD COLUMN IF NOT EXISTS nearby_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS broadcast_at        timestamptz;
