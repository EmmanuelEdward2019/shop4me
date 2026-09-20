-- Store inventories.
--
-- Most local markets sell the same things (fish, palm oil, crayfish, garri…), so
-- the catalog is keyed two ways in ONE table:
--
--   category_id set, store_id NULL  → a default item every store in that
--                                     category offers (the shared starter list)
--   store_id set,    category_id NULL → an item only that store offers
--
-- A store's inventory is therefore "its category defaults + its own rows".
-- Buyers can still type anything not listed — this table only pre-fills the
-- shopping list, it is never a restriction.
--
-- No prices: agents buy at market rates and confirm the real cost on the
-- invoice, so a stale number here would read as a quote. Units only.

CREATE TABLE IF NOT EXISTS public.store_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id   uuid REFERENCES public.store_categories(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  -- Matches SHOPPING_UNITS on the clients (piece, kg, bag, litre, plate…).
  unit          text NOT NULL DEFAULT 'piece',
  image_url     text,
  -- Surfaced in the app home slider.
  is_featured   boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_products_scope_chk CHECK (
    (store_id IS NOT NULL AND category_id IS NULL)
    OR (store_id IS NULL AND category_id IS NOT NULL)
  ),
  CONSTRAINT store_products_name_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 120)
);

-- One row per name per scope, case-insensitively, so re-running the seed or a
-- double-tap in the admin UI can't duplicate "Palm Oil".
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_store_name
  ON public.store_products (store_id, lower(btrim(name))) WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_category_name
  ON public.store_products (category_id, lower(btrim(name))) WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_products_store
  ON public.store_products (store_id, display_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_store_products_category
  ON public.store_products (category_id, display_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_store_products_featured
  ON public.store_products (display_order) WHERE is_active AND is_featured;

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.store_products;
CREATE POLICY "Anyone can view active products" ON public.store_products
  FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins can manage products" ON public.store_products;
CREATE POLICY "Admins can manage products" ON public.store_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_store_products_updated_at ON public.store_products;
CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Starter catalogs ────────────────────────────────────────────────────────
-- Seeded against the category, so every store in that category inherits them
-- on day one. `image_url` stays NULL: the apps resolve a themed fallback image
-- until an admin uploads the real photo, so nothing ever renders a broken tile.

INSERT INTO public.store_products (category_id, name, unit, is_featured, display_order)
SELECT c.id, v.name, v.unit, v.featured, v.ord
FROM (VALUES
  -- Fresh proteins
  ('Fresh Fish',        'kg',      true,   10),
  ('Dry Fish',          'piece',   false,  20),
  ('Stock Fish',        'piece',   false,  30),
  ('Crayfish',          'cup',     true,   40),
  ('Periwinkle',        'cup',     false,  50),
  ('Prawns',            'cup',     false,  60),
  ('Snail',             'piece',   false,  70),
  ('Cow Meat (Beef)',   'kg',      true,   80),
  ('Goat Meat',         'kg',      true,   90),
  ('Chicken',           'piece',   true,  100),
  ('Turkey',            'kg',      true,  110),
  ('Cow Skin (Kanda)',  'kg',      false, 120),
  ('Shaki (Tripe)',     'kg',      false, 130),
  -- Vegetables & leaves
  ('Tomato',            'basket',  true,  200),
  ('Pepper (Rodo)',     'cup',     true,  210),
  ('Tatashe',           'cup',     false, 220),
  ('Onions',            'bag',     true,  230),
  ('Afang Leaf',        'bunch',   true,  240),
  ('Waterleaf',         'bunch',   true,  250),
  ('Pumpkin Leaf (Ugu)','bunch',   true,  260),
  ('Bitterleaf',        'bunch',   false, 270),
  ('Scent Leaf',        'bunch',   false, 280),
  ('Okro',              'cup',     true,  290),
  ('Garden Egg',        'cup',     false, 300),
  ('Carrot',            'kg',      false, 310),
  ('Cabbage',           'piece',   false, 320),
  ('Cucumber',          'piece',   false, 330),
  -- Grains, tubers & staples
  ('Rice',              'bag',     true,  400),
  ('Beans',             'cup',     true,  410),
  ('Garri',             'cup',     true,  420),
  ('Yam',               'tuber',   true,  430),
  ('Cocoyam',           'cup',     false, 440),
  ('Sweet Potato',      'kg',      false, 450),
  ('Irish Potato',      'kg',      false, 460),
  ('Plantain',          'bunch',   true,  470),
  ('Semolina',          'kg',      false, 480),
  ('Poundo Yam',        'kg',      false, 490),
  ('Corn',              'cup',     false, 500),
  -- Oils, seeds & seasoning
  ('Palm Oil',          'litre',   true,  600),
  ('Groundnut Oil',     'litre',   true,  610),
  ('Melon (Egusi)',     'cup',     true,  620),
  ('Ogbono',            'cup',     false, 630),
  ('Achi',              'cup',     false, 640),
  ('Ugba (Oil Bean)',   'cup',     false, 650),
  ('Groundnut',         'cup',     false, 660),
  ('Banga (Palm Fruit)','cup',     false, 670),
  ('Seasoning Cubes',   'pack',    false, 680),
  ('Curry & Thyme',     'sachet',  false, 690),
  ('Salt',              'pack',    false, 700),
  ('Uziza Seed',        'cup',     false, 710),
  ('Ehu (Ariwo)',       'cup',     false, 720)
) AS v(name, unit, featured, ord)
CROSS JOIN public.store_categories c
WHERE c.slug = 'local-markets'
  AND NOT EXISTS (
    SELECT 1 FROM public.store_products sp
    WHERE sp.category_id = c.id AND lower(btrim(sp.name)) = lower(btrim(v.name))
  );

INSERT INTO public.store_products (category_id, name, unit, is_featured, display_order)
SELECT c.id, v.name, v.unit, v.featured, v.ord
FROM (VALUES
  -- Rice dishes
  ('Jollof Rice',              'plate',   true,   10),
  ('Rice & Stew',              'plate',   true,   20),
  ('Fried Rice',               'plate',   true,   30),
  ('Coconut Rice',             'plate',   true,   40),
  ('Native Rice (Palm Oil)',   'plate',   false,  50),
  ('Rice & Beans',             'plate',   false,  60),
  -- Swallow & soups
  ('Garri (Eba) & Soup',       'plate',   true,  100),
  ('Pounded Yam & Soup',       'plate',   true,  110),
  ('Semo & Soup',              'plate',   false, 120),
  ('Fufu & Soup',              'plate',   false, 130),
  ('Afang Soup',               'plate',   true,  140),
  ('Edikang Ikong Soup',       'plate',   true,  150),
  ('White Soup (Afia Efere)',  'plate',   true,  160),
  ('Egusi Soup',               'plate',   true,  170),
  ('Ogbono Soup',              'plate',   false, 180),
  ('Banga Soup',               'plate',   false, 190),
  ('Oha Soup',                 'plate',   false, 200),
  ('Vegetable Soup',           'plate',   false, 210),
  ('Okro Soup',                'plate',   false, 220),
  -- Pepper soups & grills
  ('Goat Meat Pepper Soup',    'plate',   true,  300),
  ('Catfish Pepper Soup',      'plate',   true,  310),
  ('Chicken Pepper Soup',      'plate',   false, 320),
  ('Nkwobi',                   'plate',   false, 330),
  ('Isi Ewu',                  'plate',   false, 340),
  ('Suya',                     'wrap',    true,  350),
  ('Grilled Chicken',          'piece',   true,  360),
  ('Grilled Fish',             'piece',   true,  370),
  ('Peppered Gizzard',         'plate',   false, 380),
  -- Beans, porridge & sides
  ('Beans (Ewa)',              'plate',   true,  400),
  ('Beans & Plantain',         'plate',   false, 410),
  ('Yam Porridge',             'plate',   false, 420),
  ('Moi Moi',                  'wrap',    false, 430),
  ('Fried Plantain (Dodo)',    'portion', true,  440),
  ('Chicken & Chips',          'plate',   true,  450),
  ('Small Chops',              'pack',    false, 460),
  ('Meat Pie',                 'piece',   false, 470),
  ('Shawarma',                 'wrap',    true,  480),
  ('Yam & Egg Sauce',          'plate',   false, 490),
  -- Drinks
  ('Bottled Water',            'bottle',  false, 600),
  ('Soft Drink',               'bottle',  false, 610),
  ('Chapman',                  'bottle',  false, 620),
  ('Fresh Juice',              'bottle',  false, 630),
  ('Zobo',                     'bottle',  false, 640),
  ('Palm Wine',                'litre',   false, 650)
) AS v(name, unit, featured, ord)
CROSS JOIN public.store_categories c
WHERE c.slug = 'restaurants'
  AND NOT EXISTS (
    SELECT 1 FROM public.store_products sp
    WHERE sp.category_id = c.id AND lower(btrim(sp.name)) = lower(btrim(v.name))
  );

INSERT INTO public.store_products (category_id, name, unit, is_featured, display_order)
SELECT c.id, v.name, v.unit, v.featured, v.ord
FROM (VALUES
  -- Beverages & breakfast
  ('Peak Milk',                'sachet',  true,   10),
  ('Three Crowns Milk',        'sachet',  false,  20),
  ('Milo',                     'pack',    true,   30),
  ('Bournvita',                'pack',    false,  40),
  ('Ovaltine',                 'pack',    false,  50),
  ('Lipton Tea',               'pack',    false,  60),
  ('Nescafe Coffee',           'pack',    false,  70),
  ('Cornflakes',               'pack',    true,   80),
  ('Golden Morn',              'pack',    false,  90),
  ('Custard',                  'pack',    false, 100),
  ('Sliced Bread',             'piece',   true,  110),
  ('Eggs',                     'dozen',   true,  120),
  ('Butter / Margarine',       'pack',    false, 130),
  ('Sugar',                    'pack',    true,  140),
  ('Honey',                    'bottle',  false, 150),
  -- Cooking staples
  ('Rice (Bag)',               'bag',     true,  200),
  ('Beans (Pack)',             'pack',    false, 210),
  ('Spaghetti',                'pack',    true,  220),
  ('Macaroni',                 'pack',    false, 230),
  ('Indomie Noodles',          'carton',  true,  240),
  ('Vegetable Oil',            'litre',   true,  250),
  ('Palm Oil (Bottled)',       'litre',   false, 260),
  ('Tomato Paste',             'sachet',  true,  270),
  ('Seasoning Cubes',          'pack',    false, 280),
  ('Table Salt',               'pack',    false, 290),
  ('Garri (Packaged)',         'pack',    false, 300),
  ('Semolina',                 'pack',    false, 310),
  ('Poundo Yam Flour',         'pack',    false, 320),
  ('Flour',                    'pack',    false, 330),
  -- Household & cleaning
  ('Detergent (Omo / Ariel)',  'pack',    true,  400),
  ('Bar Soap',                 'piece',   false, 410),
  ('Bathing Soap',             'piece',   false, 420),
  ('Toothpaste',               'piece',   true,  430),
  ('Toothbrush',               'piece',   false, 440),
  ('Toilet Tissue',            'pack',    true,  450),
  ('Serviette',                'pack',    false, 460),
  ('Bleach (Hypo / Jik)',      'bottle',  false, 470),
  ('Dishwashing Liquid',       'bottle',  false, 480),
  ('Air Freshener',            'bottle',  false, 490),
  ('Insecticide (Raid)',       'bottle',  false, 500),
  ('Cooking Gas Refill',       'kg',      false, 510),
  -- Baby & personal care
  ('Pampers / Diapers',        'pack',    true,  600),
  ('Baby Wipes',               'pack',    true,  610),
  ('Baby Formula',             'pack',    false, 620),
  ('Sanitary Pads',            'pack',    true,  630),
  ('Body Lotion',              'bottle',  false, 640),
  ('Deodorant',                'piece',   false, 650),
  ('Shampoo',                  'bottle',  false, 660),
  ('Shaving Stick',            'pack',    false, 670),
  -- Snacks & soft drinks
  ('Biscuits',                 'pack',    false, 700),
  ('Chocolate',                'piece',   false, 710),
  ('Groundnut',                'pack',    false, 720),
  ('Plantain Chips',           'pack',    false, 730),
  ('Bottled Water',            'pack',    true,  740),
  ('Soft Drinks (Crate)',      'carton',  true,  750),
  ('Fruit Juice',              'litre',   false, 760),
  ('Malt Drink',               'bottle',  false, 770),
  ('Energy Drink',             'bottle',  false, 780),
  -- Beer & spirits
  ('Beer (Star / Gulder)',     'carton',  false, 800),
  ('Heineken',                 'carton',  false, 810),
  ('Guinness Stout',           'carton',  false, 820),
  ('Smirnoff Ice',             'carton',  false, 830),
  -- Wines
  ('Four Cousins',             'bottle',  true,  900),
  ('Carlo Rossi',              'bottle',  true,  910),
  ('Baron Romero',             'bottle',  false, 920),
  ('Robertson Winery',         'bottle',  false, 930),
  ('Nederburg',                'bottle',  false, 940),
  ('Drostdy-Hof',              'bottle',  false, 950),
  ('Andre Sparkling',          'bottle',  false, 960),
  ('Martini Asti',             'bottle',  false, 970),
  ('Moet & Chandon',           'bottle',  false, 980),
  ('Chamdor (Non-Alcoholic)',  'bottle',  false, 990),
  ('Eva (Non-Alcoholic)',      'bottle',  false, 1000)
) AS v(name, unit, featured, ord)
CROSS JOIN public.store_categories c
WHERE c.slug = 'supermarkets'
  AND NOT EXISTS (
    SELECT 1 FROM public.store_products sp
    WHERE sp.category_id = c.id AND lower(btrim(sp.name)) = lower(btrim(v.name))
  );

INSERT INTO public.store_products (category_id, name, unit, is_featured, display_order)
SELECT c.id, v.name, v.unit, v.featured, v.ord
FROM (VALUES
  ('Paracetamol',              'pack',    true,   10),
  ('Ibuprofen',                'pack',    false,  20),
  ('Vitamin C',                'pack',    true,   30),
  ('Multivitamins',            'pack',    false,  40),
  ('Blood Tonic',              'bottle',  false,  50),
  ('Antimalarial (Lonart)',    'pack',    true,   60),
  ('Cough Syrup',              'bottle',  false,  70),
  ('Antacid',                  'pack',    false,  80),
  ('ORS / Salt-Sugar Solution','sachet',  false,  90),
  ('Antiseptic (Dettol)',      'bottle',  true,  100),
  ('Hand Sanitizer',           'bottle',  false, 110),
  ('Plaster / Band-Aid',       'pack',    false, 120),
  ('Cotton Wool',              'pack',    false, 130),
  ('Face Mask',                'pack',    false, 140),
  ('Thermometer',              'piece',   false, 150),
  ('BP Monitor',               'piece',   false, 160),
  ('Glucose Test Strips',      'pack',    false, 170),
  ('Antifungal Cream',         'piece',   false, 180),
  ('Eye Drops',                'bottle',  false, 190),
  ('Pain Relief Balm',         'piece',   false, 200),
  ('Baby Formula',             'pack',    false, 210),
  ('Prescription Refill',      'pack',    false, 220)
) AS v(name, unit, featured, ord)
CROSS JOIN public.store_categories c
WHERE c.slug = 'pharmacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.store_products sp
    WHERE sp.category_id = c.id AND lower(btrim(sp.name)) = lower(btrim(v.name))
  );
