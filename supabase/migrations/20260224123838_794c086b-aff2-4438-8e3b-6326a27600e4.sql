
-- Add category column to blog_posts for blog vs press content
ALTER TABLE public.blog_posts ADD COLUMN category text NOT NULL DEFAULT 'blog';

-- Seed press releases as blog_posts with category='press'
INSERT INTO public.blog_posts (title, slug, excerpt, content, author_id, is_published, published_at, category)
VALUES
  (
    'Shop4Me Launches in Port Harcourt',
    'shop4me-launches-in-port-harcourt',
    'Revolutionary personal shopping platform connects customers with local market experts.',
    'Shop4Me, a revolutionary personal shopping platform, has officially launched in Port Harcourt, Rivers State. The platform connects customers with verified local market experts — known as Shopping Agents — who handle the entire shopping process from browsing to doorstep delivery.

With a growing network of trained agents across major markets such as Mile 1, Mile 3, Oil Mill, and Town Market, Shop4Me aims to save customers time while supporting local commerce. The app allows users to submit shopping lists, receive real-time updates with photo evidence of purchases, and track deliveries live.

"We believe everyone deserves access to the best deals in local markets without the hassle of going themselves," said the Shop4Me team. "Our agents are market experts who know where to find the freshest produce, the best prices, and the most authentic goods."

Shop4Me is available on web and mobile, with plans to expand to Lagos and Abuja in the coming months.',
    (SELECT id FROM auth.users LIMIT 1),
    true,
    '2024-01-15T10:00:00Z',
    'press'
  ),
  (
    'Shop4Me Reaches 500 Active Agents',
    'shop4me-reaches-500-active-agents',
    'Growing network of verified agents now serving all major markets in Port Harcourt.',
    'Shop4Me has reached a significant milestone — 500 active, verified Shopping Agents now operate across Port Harcourt. This rapid growth demonstrates strong demand for the personal shopping service among both agents seeking flexible income and customers wanting convenient access to local markets.

Each agent undergoes a rigorous verification process including government ID checks, background screening, and comprehensive training on Shop4Me''s quality standards and customer service protocols.

"Our agents are the heart of Shop4Me," the company stated. "Reaching 500 verified agents means we can serve more customers faster, with shorter wait times and broader market coverage."

The company reports that agent satisfaction remains high, with many agents earning above the local average income through the platform''s commission-based model.',
    (SELECT id FROM auth.users LIMIT 1),
    true,
    '2024-02-20T10:00:00Z',
    'press'
  ),
  (
    'Shop4Me Partners with Major Supermarket Chains',
    'shop4me-partners-with-supermarket-chains',
    'Strategic partnerships expand shopping options for customers across the city.',
    'Shop4Me has announced strategic partnerships with several major supermarket chains in Port Harcourt, expanding the range of shopping locations available to customers. The partnerships include collaborations with popular retail outlets across the city, giving customers access to branded goods, imported products, and bulk-buy options — all through the convenience of the Shop4Me platform.

These partnerships mean agents can now shop at partner supermarkets with dedicated checkout lanes, reducing wait times and improving the overall shopping experience.

"By partnering with established retailers, we''re bridging the gap between traditional market shopping and modern retail convenience," said the Shop4Me team. "Customers can now mix and match — ordering fresh vegetables from the local market and household supplies from a supermarket, all in one order."

The company plans to continue expanding its retail partnerships and is in discussions with additional chains across Nigeria.',
    (SELECT id FROM auth.users LIMIT 1),
    true,
    '2024-03-10T10:00:00Z',
    'press'
  );
