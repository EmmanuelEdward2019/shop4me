-- 1. Add GPS coordinates to delivery_addresses
ALTER TABLE public.delivery_addresses 
  ADD COLUMN IF NOT EXISTS latitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude numeric DEFAULT NULL;

-- 2. Add buyer info to rider_alerts so riders can see delivery details
ALTER TABLE public.rider_alerts
  ADD COLUMN IF NOT EXISTS buyer_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS buyer_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_latitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_longitude numeric DEFAULT NULL;

-- 3. Create store_categories table
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'Store',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.store_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.store_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Create stores table (replaces hardcoded stores)
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.store_categories(id) ON DELETE SET NULL,
  area text NOT NULL,
  city text NOT NULL DEFAULT 'Port Harcourt',
  description text DEFAULT '',
  latitude numeric DEFAULT NULL,
  longitude numeric DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stores" ON public.stores
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage stores" ON public.stores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Add business_type to agent_applications for SME enrollment
ALTER TABLE public.agent_applications
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS business_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_address text DEFAULT NULL;

-- 6. Add service_area fields to agent_applications for routing
ALTER TABLE public.agent_applications
  ADD COLUMN IF NOT EXISTS service_latitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_longitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_radius_km numeric DEFAULT 5;

-- 7. Seed default categories
INSERT INTO public.store_categories (name, slug, icon, display_order) VALUES
  ('Supermarkets', 'supermarkets', 'ShoppingCart', 1),
  ('Local Markets', 'local-markets', 'ShoppingBag', 2),
  ('Restaurants', 'restaurants', 'Utensils', 3),
  ('Pharmacy', 'pharmacy', 'Pill', 4)
ON CONFLICT (slug) DO NOTHING;

-- 8. Seed existing stores into the stores table
INSERT INTO public.stores (name, slug, category_id, area, city, description, latitude, longitude) VALUES
  ('Market Square', 'market-square', (SELECT id FROM public.store_categories WHERE slug = 'supermarkets'), 'Peter Odili Road', 'Port Harcourt', 'Leading supermarket chain', 4.8563, 7.0275),
  ('SPAR Supermarket', 'spar-ph', (SELECT id FROM public.store_categories WHERE slug = 'supermarkets'), 'Trans Amadi', 'Port Harcourt', 'Quality groceries & more', 4.8205, 7.0342),
  ('Port Harcourt Mall', 'port-harcourt-mall', (SELECT id FROM public.store_categories WHERE slug = 'supermarkets'), 'Azikiwe Road', 'Port Harcourt', 'Premium shopping destination', 4.8156, 7.0498),
  ('Genesis Mall', 'genesis-mall', (SELECT id FROM public.store_categories WHERE slug = 'supermarkets'), 'Rumuola', 'Port Harcourt', 'Modern retail complex', 4.8472, 7.0194),
  ('Mile 1 Market', 'mile-1-market', (SELECT id FROM public.store_categories WHERE slug = 'local-markets'), 'Mile 1', 'Port Harcourt', 'Electronics & general goods', 4.7748, 7.0134),
  ('Mile 3 Market', 'mile-3-market', (SELECT id FROM public.store_categories WHERE slug = 'local-markets'), 'Mile 3', 'Port Harcourt', 'Fresh produce & foodstuffs', 4.7942, 7.0089),
  ('Oil Mill Market', 'oil-mill-market', (SELECT id FROM public.store_categories WHERE slug = 'local-markets'), 'Eleme Junction', 'Port Harcourt', 'Largest market in Rivers', 4.8103, 7.0653),
  ('Rumuokoro Market', 'rumuokoro-market', (SELECT id FROM public.store_categories WHERE slug = 'local-markets'), 'Rumuokoro', 'Port Harcourt', 'Building materials & more', 4.8621, 6.9987),
  ('Creek Road Market', 'creek-road-market', (SELECT id FROM public.store_categories WHERE slug = 'local-markets'), 'D-Line', 'Port Harcourt', 'Fashion & fabrics', 4.7817, 7.0201),
  ('Slaughter Market', 'slaughter-market', (SELECT id FROM public.store_categories WHERE slug = 'local-markets'), 'Trans Amadi', 'Port Harcourt', 'Fresh meat & seafood', 4.8189, 7.0378),
  ('Polo Club Shopping', 'polo-club-plaza', (SELECT id FROM public.store_categories WHERE slug = 'supermarkets'), 'GRA Phase 2', 'Port Harcourt', 'Upscale boutiques', 4.7965, 7.0312),
  ('Ada George Plaza', 'ada-george-plaza', (SELECT id FROM public.store_categories WHERE slug = 'supermarkets'), 'Ada George', 'Port Harcourt', 'Diverse retail stores', 4.8341, 7.0023)
ON CONFLICT (slug) DO NOTHING;

-- 9. Add updated_at trigger for new tables
CREATE TRIGGER update_store_categories_updated_at BEFORE UPDATE ON public.store_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Index for order routing by location
CREATE INDEX IF NOT EXISTS idx_agent_applications_service_location 
  ON public.agent_applications(service_latitude, service_longitude) 
  WHERE status = 'approved';

-- 11. Index for stores by category
CREATE INDEX IF NOT EXISTS idx_stores_category ON public.stores(category_id) WHERE is_active = true;