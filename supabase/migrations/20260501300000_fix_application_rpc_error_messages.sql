-- =============================================================================
-- Fix: Replace technical/misleading error messages in submit_agent_application
-- with clear, user-friendly equivalents.
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_agent_application(
  p_user_id        uuid,
  p_email          text,
  p_full_name      text,
  p_phone          text,
  p_date_of_birth  text,
  p_gender         text,
  p_address        text,
  p_city           text,
  p_state          text,
  p_lga            text    DEFAULT '',
  p_role_type      text    DEFAULT 'shopping_agent',
  p_id_type        text    DEFAULT '',
  p_id_number      text    DEFAULT '',
  p_bank_name      text    DEFAULT '',
  p_account_number text    DEFAULT '',
  p_account_name   text    DEFAULT '',
  p_has_smartphone boolean DEFAULT true,
  p_has_vehicle    boolean DEFAULT false,
  p_vehicle_type   text    DEFAULT NULL,
  p_market_knowledge text[] DEFAULT '{}',
  p_experience_description text DEFAULT NULL,
  p_how_heard_about_us     text DEFAULT NULL,
  p_business_type          text DEFAULT 'individual',
  p_business_name          text DEFAULT NULL,
  p_business_address       text DEFAULT NULL,
  p_photo_url              text DEFAULT NULL,
  p_id_document_url        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate: user must exist in auth.users with matching email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id AND email = p_email
  ) THEN
    RAISE EXCEPTION 'This email address is already registered. Please sign in to your existing account or use a different email address.';
  END IF;

  -- Prevent duplicate applications
  IF EXISTS (
    SELECT 1 FROM public.agent_applications WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You have already submitted an application with this account. Our team will review it and contact you within 48 hours.';
  END IF;

  INSERT INTO public.agent_applications (
    user_id, full_name, email, phone, date_of_birth, gender,
    address, city, state, lga, role_type,
    id_type, id_number,
    bank_name, account_number, account_name,
    has_smartphone, has_vehicle, vehicle_type,
    market_knowledge, experience_description,
    how_heard_about_us,
    business_type, business_name, business_address,
    photo_url, id_document_url,
    status
  ) VALUES (
    p_user_id, p_full_name, p_email, p_phone, p_date_of_birth::date, p_gender,
    p_address, p_city, p_state, p_lga, p_role_type,
    p_id_type, p_id_number,
    p_bank_name, p_account_number, p_account_name,
    p_has_smartphone, p_has_vehicle, p_vehicle_type,
    p_market_knowledge, p_experience_description,
    p_how_heard_about_us,
    p_business_type, p_business_name, p_business_address,
    p_photo_url, p_id_document_url,
    'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_agent_application(
  uuid, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text,
  boolean, boolean, text, text[], text, text, text, text, text,
  text, text
) TO anon, authenticated;
