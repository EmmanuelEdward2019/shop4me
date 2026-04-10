
-- Update existing Market Square to be a named branch
UPDATE public.stores 
SET parent_brand = 'Market Square', 
    branch_name = 'Peter Odili Road',
    address = '279 Peter Odili Road, Trans Amadi Industrial Layout, Port Harcourt'
WHERE id = 'c310e728-71e4-48fc-8922-b43e83e8a178';

-- Insert remaining 12 Market Square branches
INSERT INTO public.stores (name, slug, category_id, area, city, description, parent_brand, branch_name, address, latitude, longitude, is_active)
VALUES
  ('Market Square Agip', 'marketsquare-agip', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Agip', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Agip', 'Agip Road Rumueme, Mile 4, Port Harcourt', 4.8180, 6.9850, true),
  ('Market Square Onne', 'marketsquare-onne', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Onne', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Onne', 'Express, FOT Roundabout, Onne, Port Harcourt', 4.7120, 7.1520, true),
  ('Market Square Ada George', 'marketsquare-adageorge', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Ada George', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Ada George', '9 Ada George Road, Mgbuoba, Port Harcourt', 4.8350, 6.9620, true),
  ('Market Square Rumuolumeni', 'marketsquare-rumuolumeni', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Rumuolumeni', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Rumuolumeni', 'Rumuolumeni Road, Port Harcourt', 4.8050, 6.9680, true),
  ('Market Square Woji', 'marketsquare-woji', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Woji', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Woji', 'Plot 34 Woji Road, GRA Phase 2, Port Harcourt', 4.8120, 7.0350, true),
  ('Market Square Rumuodara', 'marketsquare-rumuodara', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Rumuodara', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Rumuodara', '198B Okporo Road, Rumuodara Junction, Port Harcourt', 4.8580, 7.0420, true),
  ('Market Square Rumuibekwe', 'marketsquare-rumuibekwe', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Rumuibekwe', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Rumuibekwe', '1 Rumuibekwe Road, Port Harcourt', 4.8480, 7.0180, true),
  ('Market Square Choba', 'marketsquare-choba', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Choba', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Choba', 'Uniport, Along East-West Road, Choba, Port Harcourt', 4.8650, 6.9180, true),
  ('Market Square Rukpokwu', 'marketsquare-rukpokwu', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Rukpokwu', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Rukpokwu', 'Rukpokwu Roundabout, Along Airport, Port Harcourt', 4.8750, 7.0280, true),
  ('Market Square Elelenwo', 'marketsquare-elelenwo', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Elelenwo', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Elelenwo', 'Old Refinery Road, Victory Estate Junction, Elelenwo, Port Harcourt', 4.8280, 7.0580, true),
  ('Market Square Old GRA', 'marketsquare-oldgra', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'GRA Phase 2', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Old GRA', '13 Nzimiro Street, Old GRA, Port Harcourt', 4.7750, 7.0150, true),
  ('Market Square Mile 3', 'marketsquare-mile3', '03132c26-77f6-45e4-87ee-93f241ffd40c', 'Mile 3', 'Port Harcourt', 'Quality groceries & household essentials', 'Market Square', 'Mile 3', 'By Mile 3 Bus Stop, Ikwerre Road, Port Harcourt', 4.8220, 6.9920, true);
