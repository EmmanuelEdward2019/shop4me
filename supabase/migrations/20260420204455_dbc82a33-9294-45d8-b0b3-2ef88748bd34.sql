
-- =========================================================
-- 1. SERVICE FEE TIERS (tiered % on subtotal)
-- =========================================================
CREATE TABLE public.service_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_subtotal numeric NOT NULL,
  max_subtotal numeric,            -- NULL = no upper bound
  percentage numeric NOT NULL,     -- e.g. 10.00 means 10%
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_fee_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service fee tiers"
  ON public.service_fee_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can insert service fee tiers"
  ON public.service_fee_tiers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update service fee tiers"
  ON public.service_fee_tiers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete service fee tiers"
  ON public.service_fee_tiers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_service_fee_tiers_updated
  BEFORE UPDATE ON public.service_fee_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_fee_tiers (min_subtotal, max_subtotal, percentage, display_order) VALUES
  (0,     20000, 10, 1),
  (20001, 50000, 7,  2),
  (50001, NULL,  5,  3);

-- =========================================================
-- 2. DELIVERY FEE TIERS (distance bands -> flat fee)
-- =========================================================
CREATE TABLE public.delivery_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_km numeric NOT NULL,
  max_km numeric,                  -- NULL = no upper bound
  fee numeric NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_fee_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view delivery fee tiers"
  ON public.delivery_fee_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can insert delivery fee tiers"
  ON public.delivery_fee_tiers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update delivery fee tiers"
  ON public.delivery_fee_tiers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete delivery fee tiers"
  ON public.delivery_fee_tiers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_delivery_fee_tiers_updated
  BEFORE UPDATE ON public.delivery_fee_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.delivery_fee_tiers (min_km, max_km, fee, display_order) VALUES
  (0,  3,    1500, 1),
  (3,  7,    2500, 2),
  (7,  15,   3500, 3),
  (15, 25,   4000, 4),
  (25, NULL, 5000, 5);

-- =========================================================
-- 3. ZONE CENTROIDS (fallback when no buyer GPS pin)
-- =========================================================
CREATE TABLE public.zone_centroids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_slug text NOT NULL UNIQUE,
  label text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zone_centroids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view zone centroids"
  ON public.zone_centroids FOR SELECT USING (true);
CREATE POLICY "Admins can insert zone centroids"
  ON public.zone_centroids FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update zone centroids"
  ON public.zone_centroids FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete zone centroids"
  ON public.zone_centroids FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_zone_centroids_updated
  BEFORE UPDATE ON public.zone_centroids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Port Harcourt zone centroids (approximate)
INSERT INTO public.zone_centroids (zone_slug, label, latitude, longitude) VALUES
  ('mile1',         'Mile 1',              4.7912, 7.0140),
  ('mile3',         'Mile 3',              4.8146, 7.0034),
  ('dline',         'D-Line',              4.8050, 7.0146),
  ('gra',           'GRA Phase 2',         4.8255, 7.0237),
  ('rumuokoro',     'Rumuokoro',           4.8716, 6.9833),
  ('rumuola',       'Rumuola',             4.8403, 7.0044),
  ('adageorge',     'Ada George',          4.8536, 6.9829),
  ('transamadi',    'Trans Amadi',         4.7980, 7.0333),
  ('peterodili',    'Peter Odili Road',    4.7820, 7.0313),
  ('elemejunction', 'Eleme Junction',      4.8000, 7.0900),
  ('azikiwe',       'Azikiwe Road',        4.7790, 7.0090),
  ('choba',         'Choba',               4.8900, 6.9100),
  ('elelenwo',      'Elelenwo',            4.8470, 7.0833),
  ('woji',          'Woji',                4.8200, 7.0680),
  ('rumuomasi',     'Rumuomasi',           4.8150, 7.0367),
  ('rsu',           'RSU',                 4.8005, 6.9787),
  ('agip',          'Agip',                4.8595, 6.9885),
  ('oilmill',       'Oil Mill',            4.8810, 7.0850),
  ('rumuibekwe',    'Rumuibekwe',          4.8350, 7.0260),
  ('rumuokwuta',    'Rumuokwuta',          4.8480, 6.9920),
  ('rumuodara',     'Rumuodara',           4.8770, 7.0470),
  ('rumuolumeni',   'Rumuolumeni',         4.8240, 6.9555),
  ('rukpokwu',      'Rukpokwu',            4.9090, 7.0200),
  ('onne',          'Onne',                4.7160, 7.1530),
  ('rumuobiakani',  'Rumuobiakani',        4.8090, 7.0480),
  ('sanniabacha',   'Sanni Abacha',        4.8260, 7.0080),
  ('abaroad',       'Aba Road',            4.8350, 7.0490),
  ('grphase3',      'GRA Phase 3',         4.8410, 7.0310);

-- =========================================================
-- 4. NEW PLATFORM SETTINGS (surge, heavy, min delivery)
-- =========================================================
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('surge_active',           'false'::jsonb, 'Manual on/off switch for surge pricing'),
  ('surge_multiplier',       '1.25'::jsonb,  'Multiplier applied to delivery fee when surge_active = true'),
  ('heavy_order_surcharge',  '1000'::jsonb,  'Flat NGN surcharge added when agent flags an order as heavy/bulk'),
  ('minimum_delivery_fee',   '1000'::jsonb,  'Floor price for any delivery fee, regardless of distance')
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 5. ORDER FLAGS (agent heavy flag + surge audit)
-- =========================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_heavy_order boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS surge_applied numeric;
