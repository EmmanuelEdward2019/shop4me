
-- Create platform settings table for admin-configurable fees
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert
CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default fees
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('default_service_fee', '1500'::jsonb, 'Default service fee in NGN'),
  ('default_delivery_fee', '1500'::jsonb, 'Default delivery fee in NGN');
