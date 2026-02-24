
-- Insert a test delivered order
INSERT INTO public.orders (id, user_id, agent_id, location_name, location_type, status, estimated_total, final_total, delivery_fee, service_fee, notes)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '9e709681-af83-4099-9e81-424b019076ac',
  '0d8f1bda-481d-49dc-9be5-dc2304d979cb',
  'Balogun Market',
  'market',
  'delivered',
  15000,
  14500,
  1500,
  500,
  'Test order for invoice email flow'
);

-- Insert test order items
INSERT INTO public.order_items (order_id, name, description, quantity, estimated_price, actual_price, status)
VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Rice (50kg bag)', 'Golden Penny brand', 1, 8000, 7500, 'found'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Palm Oil (5L)', 'Devon King''s', 2, 3500, 3500, 'found'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Tomato Paste (tin)', 'Gino brand', 3, 500, 500, 'found');
