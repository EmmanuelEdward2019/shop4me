-- What buyers asked for that we don't stock.
--
-- Every item a buyer types by hand instead of picking from a store's inventory
-- is a gap in that inventory. Rather than have the apps report those separately
-- (which would miss the web app, agent-built lists, and everything ordered
-- before the catalog existed), this derives them from order history: any
-- order_items row whose name isn't already in the catalog for that order's
-- category is a suggestion.
--
-- Admins review and promote them from Stores → Inventory. Nothing is added to
-- the catalog automatically — buyer free text contains typos, quantities and
-- one-off requests, and those would end up in front of every other buyer.

-- ── Name normalisation ──────────────────────────────────────────────────────
-- Groups "Fresh Tomatoes", "fresh tomatoes" and "2 baskets of Fresh Tomatoes"
-- into one suggestion. Deliberately conservative: merging two genuinely
-- different products is worse than showing one item twice.
CREATE OR REPLACE FUNCTION public.normalize_product_name(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            -- drop a leading count and unit: "2 bags of ", "3x ", "5kg "
            regexp_replace(
              -- drop parenthetical asides: "Rice (5kg)"
              regexp_replace(
                -- Fold accents first, or "Moet" and "Moët" become different
                -- products and the wine we already stock is suggested forever.
                translate(lower(COALESCE(raw, '')),
                          'àáâãäåèéêëìíîïòóôõöøùúûüçñýÿ',
                          'aaaaaaeeeeiiiioooooouuuucnyy'),
                '\(.*?\)', ' ', 'g'),
              '^\s*[0-9]+\s*(x|pcs?|pieces?|bags?|packs?|kgs?|g|grams?|litres?|liters?|l|ml|cups?|bottles?|cartons?|dozens?|tubers?|baskets?|bunch|bunches|sachets?|wraps?|plates?|kegs?|gallons?|portions?)?\s*(of\s+)?',
              '', 'g'),
            '[^a-z0-9 ]+', ' ', 'g'),          -- punctuation → space
          '\s+', ' ', 'g'),                     -- collapse runs of space
        '^(the|some|a|an)\s+', '', 'g'),        -- leading filler
      ' '),
    '')
$$;

-- `orders.shop_category` carries a store_categories slug, but the apps have
-- written it in a few shapes over time ('local-markets', 'local_market',
-- 'supermarket' vs 'supermarkets'). This folds them onto one key.
CREATE OR REPLACE FUNCTION public.store_category_key(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(regexp_replace(lower(COALESCE(raw, '')), '[-_\s]', '', 'g'), 's$', ''), '')
$$;

-- ── Dismissals ──────────────────────────────────────────────────────────────
-- A suggestion an admin has judged not to be a real product ("2 crates", a
-- typo, a one-off favour). Without this the same noise returns every time.
CREATE TABLE IF NOT EXISTS public.store_product_suggestion_dismissals (
  category_id     uuid NOT NULL REFERENCES public.store_categories(id) ON DELETE CASCADE,
  normalized_name text NOT NULL,
  dismissed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, normalized_name)
);

ALTER TABLE public.store_product_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage suggestion dismissals" ON public.store_product_suggestion_dismissals;
CREATE POLICY "Admins manage suggestion dismissals" ON public.store_product_suggestion_dismissals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_order_items_name_lower
  ON public.order_items (lower(btrim(name)));

-- ── The suggestion list ─────────────────────────────────────────────────────
-- SECURITY DEFINER + explicit admin guard, matching the other admin_* RPCs:
-- the function reads every buyer's order_items, so the guard is what enforces
-- access.
CREATE OR REPLACE FUNCTION public.admin_inventory_suggestions(
  p_category_id   uuid DEFAULT NULL,
  p_min_requests  int  DEFAULT 1,
  p_limit         int  DEFAULT 100
)
RETURNS TABLE (
  category_id     uuid,
  category_name   text,
  normalized_name text,
  display_name    text,
  suggested_unit  text,
  times_requested bigint,
  buyers          bigint,
  first_requested timestamptz,
  last_requested  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
  v_min   int := GREATEST(COALESCE(p_min_requests, 1), 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  WITH requested AS (
    SELECT
      cat.id                                       AS category_id,
      public.normalize_product_name(oi.name)       AS normalized_name,
      btrim(oi.name)                               AS raw_name,
      -- The apps fold the chosen unit into the description as "Unit: Basket".
      substring(oi.description from 'Unit:\s*([A-Za-z][A-Za-z ()]*)') AS raw_unit,
      o.user_id,
      oi.created_at
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    -- LATERAL, not a plain join: an order could otherwise match two categories
    -- and double-count the request.
    JOIN LATERAL (
      SELECT c.id
      FROM public.store_categories c
      WHERE public.store_category_key(c.slug) = public.store_category_key(o.shop_category)
         OR c.id::text = o.shop_category
      LIMIT 1
    ) cat ON true
    WHERE o.shop_category IS NOT NULL
      AND public.normalize_product_name(oi.name) IS NOT NULL
      -- Pure numbers and single characters are never products.
      AND length(public.normalize_product_name(oi.name)) BETWEEN 2 AND 120
      AND public.normalize_product_name(oi.name) !~ '^[0-9 ]+$'
  ),
  -- Already offered: on the category itself, or on any store within it.
  stocked AS (
    SELECT DISTINCT
      COALESCE(sp.category_id, st.category_id)     AS category_id,
      public.normalize_product_name(sp.name)       AS normalized_name
    FROM public.store_products sp
    LEFT JOIN public.stores st ON st.id = sp.store_id
    WHERE COALESCE(sp.category_id, st.category_id) IS NOT NULL
  )
  SELECT
    agg.category_id,
    agg.category_name,
    agg.normalized_name,
    -- Whatever spelling won, never publish a SHOUTED product name; buyers see
    -- this in the app. Short tokens are left alone so acronyms survive.
    CASE WHEN agg.picked_name = upper(agg.picked_name) AND length(agg.picked_name) > 4
         THEN initcap(agg.picked_name) ELSE agg.picked_name END AS display_name,
    agg.suggested_unit,
    agg.times_requested,
    agg.buyers,
    agg.first_requested,
    agg.last_requested
  FROM (
    SELECT
      r.category_id,
      c.name AS category_name,
      r.normalized_name,
      -- Pick the cleanest spelling buyers used: shortest (so no "2 baskets of"
      -- prefix), never ALL CAPS, prefer a leading capital, then C collation so
      -- "Fresh Tomatoes" beats "fresh tomatoes" deterministically.
      left((array_agg(r.raw_name ORDER BY
        length(r.raw_name),
        (r.raw_name = upper(r.raw_name)),
        (substring(r.raw_name, 1, 1) <> upper(substring(r.raw_name, 1, 1))),
        r.raw_name COLLATE "C"))[1], 120)        AS picked_name,
      mode() WITHIN GROUP (ORDER BY r.raw_unit)  AS suggested_unit,
      count(*)                                   AS times_requested,
      count(DISTINCT r.user_id)                  AS buyers,
      min(r.created_at)                          AS first_requested,
      max(r.created_at)                          AS last_requested
    FROM requested r
    JOIN public.store_categories c ON c.id = r.category_id
    WHERE (p_category_id IS NULL OR r.category_id = p_category_id)
      AND NOT EXISTS (
        SELECT 1 FROM stocked s
        WHERE s.category_id = r.category_id AND s.normalized_name = r.normalized_name
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.store_product_suggestion_dismissals d
        WHERE d.category_id = r.category_id AND d.normalized_name = r.normalized_name
      )
    GROUP BY r.category_id, c.name, r.normalized_name
    HAVING count(*) >= v_min
  ) agg
  ORDER BY agg.times_requested DESC, agg.last_requested DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_inventory_suggestions(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_inventory_suggestions(uuid, int, int) TO authenticated;
