-- Update the existing service fee setting to be percentage-based
UPDATE public.platform_settings 
SET key = 'service_fee_percentage', 
    value = '10'::jsonb,
    description = 'Service fee as a percentage of items subtotal (e.g. 10 means 10%)'
WHERE key = 'default_service_fee';
