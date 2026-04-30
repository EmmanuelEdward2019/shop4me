-- =============================================================================
-- Recreate service_fee_tiers and delivery_fee_tiers tables.
-- Also seeds/upserts platform_settings rows required by AdminSettings.
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- ─── SERVICE FEE TIERS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_fee_tiers (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_subtotal  numeric     NOT NULL DEFAULT 0,
  max_subtotal  numeric,
  percentage    numeric     NOT NULL DEFAULT 10,
  display_order integer     NOT NULL DEFAULT 1,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_fee_tiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'service_fee_tiers'
      AND policyname = 'Anyone can read service fee tiers'
  ) THEN
    CREATE POLICY "Anyone can read service fee tiers"
      ON public.service_fee_tiers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'service_fee_tiers'
      AND policyname = 'Admins can manage service fee tiers'
  ) THEN
    CREATE POLICY "Admins can manage service fee tiers"
      ON public.service_fee_tiers FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Seed default service fee tiers (only if table is empty)
INSERT INTO public.service_fee_tiers (min_subtotal, max_subtotal, percentage, display_order, is_active)
SELECT * FROM (VALUES
  (0,      4999,  15, 1, true),
  (5000,   14999, 12, 2, true),
  (15000,  49999, 10, 3, true),
  (50000,  NULL,   8, 4, true)
) AS v(min_subtotal, max_subtotal, percentage, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.service_fee_tiers LIMIT 1);

-- ─── DELIVERY FEE TIERS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delivery_fee_tiers (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_km        numeric     NOT NULL DEFAULT 0,
  max_km        numeric,
  fee           numeric     NOT NULL DEFAULT 1500,
  display_order integer     NOT NULL DEFAULT 1,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_fee_tiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_fee_tiers'
      AND policyname = 'Anyone can read delivery fee tiers'
  ) THEN
    CREATE POLICY "Anyone can read delivery fee tiers"
      ON public.delivery_fee_tiers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_fee_tiers'
      AND policyname = 'Admins can manage delivery fee tiers'
  ) THEN
    CREATE POLICY "Admins can manage delivery fee tiers"
      ON public.delivery_fee_tiers FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Seed default delivery fee tiers (only if table is empty)
INSERT INTO public.delivery_fee_tiers (min_km, max_km, fee, display_order, is_active)
SELECT * FROM (VALUES
  (0,    2.9,  800,  1, true),
  (3,    6.9,  1500, 2, true),
  (7,    14.9, 2500, 3, true),
  (15,   NULL, 4000, 4, true)
) AS v(min_km, max_km, fee, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_fee_tiers LIMIT 1);

-- ─── PLATFORM SETTINGS (surge & surcharge rows) ───────────────────────────────

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('surge_active',         'false'::jsonb,  'Whether surge pricing is active'),
  ('surge_multiplier',     '1.25'::jsonb,   'Surge multiplier applied to delivery fee when surge is active'),
  ('heavy_order_surcharge','1000'::jsonb,   'Extra fee in NGN added when an agent marks an order as heavy/bulk'),
  ('minimum_delivery_fee', '1000'::jsonb,   'Delivery fee floor in NGN — fee never drops below this value')
ON CONFLICT (key) DO NOTHING;
