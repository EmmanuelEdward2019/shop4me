
-- Add branch support columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS branch_name text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS parent_brand text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone text;

-- Insert Genesis Restaurant branches
INSERT INTO public.stores (name, slug, category_id, area, city, description, address, branch_name, parent_brand, latitude, longitude, is_active)
VALUES
('Genesis Centre GRA', 'genesis-centre-gra', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'GRA Phase 2', 'Port Harcourt', 'Premium dining at Genesis Centre', '39 Tombia Street, GRA Phase 2', 'Genesis Centre', 'Genesis Restaurant', 4.8015, 7.0098, true),
('Genesis Wimpey Rumuepirikom', 'genesis-wimpey', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rumuola', 'Port Harcourt', 'Genesis Restaurant Wimpey branch', 'Rumuepirikom Road', 'Wimpey', 'Genesis Restaurant', 4.8230, 7.0340, true),
('Genesis Choba', 'genesis-choba', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Choba', 'Port Harcourt', 'Genesis Restaurant Choba branch', 'Choba Junction', 'Choba', 'Genesis Restaurant', 4.8905, 6.9180, true),
('Genesis Elelenwo', 'genesis-elelenwo', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Elelenwo', 'Port Harcourt', 'Genesis Restaurant Elelenwo branch', 'Elelenwo/Akpajo Road', 'Elelenwo', 'Genesis Restaurant', 4.8350, 7.0620, true),
('Genesis Trans Amadi', 'genesis-transamadi', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Trans Amadi', 'Port Harcourt', 'Genesis Restaurant Trans Amadi branch', 'Opposite Polaris By Mothercat, Trans Amadi', 'Trans Amadi', 'Genesis Restaurant', 4.8120, 7.0450, true),
('Genesis Rumuomasi', 'genesis-rumuomasi', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rumuomasi', 'Port Harcourt', 'Genesis Restaurant Rumuomasi branch', 'By Market Junction, Aba Road', 'Rumuomasi', 'Genesis Restaurant', 4.8280, 7.0280, true),
('Genesis RSU', 'genesis-rsu', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'RSU', 'Port Harcourt', 'Genesis Restaurant RSU Annex', 'Rivers State University Roundabout', 'RSU Annex', 'Genesis Restaurant', 4.8010, 6.9780, true),
('Genesis Woji', 'genesis-woji', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Woji', 'Port Harcourt', 'Genesis Restaurant Woji branch', 'Rumurolu, Woji', 'Woji', 'Genesis Restaurant', 4.8180, 7.0750, true),
('Genesis Shell Gate', 'genesis-shellgate', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Aba Road', 'Port Harcourt', 'Genesis Restaurant Shell Gate branch', '67 PH-Aba Express, By Shell Gate', 'Shell Gate', 'Genesis Restaurant', 4.8150, 7.0200, true),
('Genesis Oil Mill', 'genesis-oilmill', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Oil Mill', 'Port Harcourt', 'Genesis Restaurant Avina/Oil Mill branch', 'Oil Mill Bustop', 'Oil Mill (Avina)', 'Genesis Restaurant', 4.8400, 7.0680, true),
('Genesis Agip', 'genesis-agip', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Agip', 'Port Harcourt', 'Genesis Restaurant Agip branch', 'Agip, Rumueme', 'Agip', 'Genesis Restaurant', 4.8100, 6.9950, true),

-- Insert Kilimanjaro Restaurant branches
('Kilimanjaro Agip', 'kilimanjaro-agip', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Agip', 'Port Harcourt', 'Kilimanjaro at Agip Roundabout', '1 Agip Road, Agip Roundabout, Rumeme', 'Agip', 'Kilimanjaro', 4.8100, 6.9950, true),
('Kilimanjaro GRA', 'kilimanjaro-gra', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'GRA Phase 2', 'Port Harcourt', 'Kilimanjaro GRA Junction', 'GRA Junction, Aba Road', 'GRA', 'Kilimanjaro', 4.8015, 7.0098, true),
('Kilimanjaro Onne Road', 'kilimanjaro-onne-road', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'GRA Phase 2', 'Port Harcourt', 'Kilimanjaro on Onne Road, GRA Phase II', '222 Onne Road, GRA Phase II', 'GRA (Onne Road)', 'Kilimanjaro', 4.7980, 7.0150, true),
('Kilimanjaro Woji', 'kilimanjaro-woji', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Woji', 'Port Harcourt', 'Kilimanjaro YKC Junction, Woji', 'YKC Junction, Woji Road', 'Woji (YKC)', 'Kilimanjaro', 4.8180, 7.0750, true),
('Kilimanjaro Trans Amadi', 'kilimanjaro-transamadi', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Trans Amadi', 'Port Harcourt', 'Kilimanjaro Bewac Junction', 'Bewac Junction, T/A Road', 'Trans Amadi', 'Kilimanjaro', 4.8120, 7.0450, true),
('Kilimanjaro Choba', 'kilimanjaro-choba', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Choba', 'Port Harcourt', 'Kilimanjaro Uniport Choba', 'Uniport Choba', 'Choba', 'Kilimanjaro', 4.8905, 6.9180, true),
('Kilimanjaro Onne FOT', 'kilimanjaro-onne-fot', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Onne', 'Port Harcourt', 'Kilimanjaro Onne FOT Roundabout', 'Onne, FOT Roundabout', 'Onne (FOT)', 'Kilimanjaro', 4.7200, 7.1500, true),
('Kilimanjaro Rumuibekwe', 'kilimanjaro-rumuibekwe', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rumuibekwe', 'Port Harcourt', 'Kilimanjaro Rumuibekwe Junction', 'Rumuibekwe Junction', 'Rumuibekwe', 'Kilimanjaro', 4.8350, 7.0400, true),
('Kilimanjaro Rumuokwuta', 'kilimanjaro-rumuokwuta', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rumuokwuta', 'Port Harcourt', 'Kilimanjaro Rumuokwuta Roundabout', 'Rumuokwuta Roundabout', 'Rumuokwuta', 'Kilimanjaro', 4.8400, 7.0350, true),
('Kilimanjaro Rumuodara', 'kilimanjaro-rumuodara', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rumuodara', 'Port Harcourt', 'Kilimanjaro Rumuodara Junction', 'Rumuodara Junction', 'Rumuodara', 'Kilimanjaro', 4.8600, 7.0500, true),
('Kilimanjaro Rukpokwu', 'kilimanjaro-rukpokwu', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rukpokwu', 'Port Harcourt', 'Kilimanjaro Rukpokwu Roundabout', 'Rukpokwu Roundabout', 'Rukpokwu', 'Kilimanjaro', 4.8700, 7.0600, true),
('Kilimanjaro Elelenwo', 'kilimanjaro-elelenwo', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Elelenwo', 'Port Harcourt', 'Kilimanjaro Old Refinery, Elelenwo', 'Old Refinery, Elelenwo', 'Elelenwo', 'Kilimanjaro', 4.8350, 7.0620, true),

-- Insert Chicken Republic branches
('Chicken Republic Elelenwo', 'chicken-republic-elelenwo', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Elelenwo', 'Port Harcourt', 'Chicken Republic Elelenwo branch', 'Elelenwo, Port Harcourt', 'Elelenwo', 'Chicken Republic', 4.8350, 7.0620, true),
('Chicken Republic GRA Phase 3', 'chicken-republic-gra3', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'GRA Phase 3', 'Port Harcourt', 'Chicken Republic GRA Phase 3 branch', 'GRA Phase 3, Port Harcourt', 'GRA Phase 3', 'Chicken Republic', 4.7950, 7.0200, true),
('Chicken Republic Aba Expressway', 'chicken-republic-abaexpy', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Aba Road', 'Port Harcourt', 'Chicken Republic PH-Aba Expressway branch', 'Port Harcourt Aba Expressway', 'Aba Expressway', 'Chicken Republic', 4.8150, 7.0200, true),
('Chicken Republic Rumuobiakani', 'chicken-republic-rumuobiakani', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Rumuobiakani', 'Port Harcourt', 'Chicken Republic Rumuobiakani branch', 'Rumuobiakani, Port Harcourt', 'Rumuobiakani', 'Chicken Republic', 4.8250, 7.0300, true),
('Chicken Republic Sanni Abacha', 'chicken-republic-sanniabacha', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Sanni Abacha', 'Port Harcourt', 'Chicken Republic Sanni Abacha branch', 'Sanni Abacha Road, Port Harcourt', 'Sanni Abacha', 'Chicken Republic', 4.7900, 7.0100, true),
('Chicken Republic Trans Amadi', 'chicken-republic-transamadi', '2bfac26b-bf3b-4954-98c3-c88985bc44f4', 'Trans Amadi', 'Port Harcourt', 'Chicken Republic Trans Amadi branch', 'Trans Amadi, Port Harcourt', 'Trans Amadi', 'Chicken Republic', 4.8120, 7.0450, true);
