-- Fix: profiles.full_name and profiles.phone were never populated from signup
-- metadata. The handle_new_user trigger only inserted (user_id, email), so any
-- signup whose client didn't separately write these left them NULL — which is
-- why users since early June show blank name/phone in /admin/users.
--
-- This (1) updates the trigger to copy full_name + phone from the signup
-- metadata for all NEW users, and (2) backfills existing profiles from
-- auth.users metadata. Idempotent and additive — it only FILLS missing values,
-- never overwrites existing data, and preserves the role/wallet logic exactly.

-- ── 1. Trigger now captures name + phone at signup ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role;
  v_meta_role TEXT;
BEGIN
  -- Create profile WITH the name/phone submitted at signup. COALESCE covers the
  -- common metadata key spellings used by the web and mobile clients.
  INSERT INTO public.profiles (user_id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'fullName',
      NEW.raw_user_meta_data->>'name'
    )), ''),
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'phoneNumber'
    )), '')
  );

  -- Role from signup metadata (unchanged behaviour).
  v_meta_role := NEW.raw_user_meta_data->>'role';
  IF v_meta_role = 'delivery_rider' THEN
    v_role := 'rider'::app_role;
  ELSIF v_meta_role = 'shopping_agent' OR v_meta_role = 'both' THEN
    v_role := 'agent'::app_role;
  ELSE
    v_role := 'buyer'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. Backfill existing profiles from auth metadata (missing values only) ───
UPDATE public.profiles p
SET full_name = sub.name
FROM (
  SELECT u.id,
         NULLIF(TRIM(COALESCE(
           u.raw_user_meta_data->>'full_name',
           u.raw_user_meta_data->>'fullName',
           u.raw_user_meta_data->>'name'
         )), '') AS name
  FROM auth.users u
) sub
WHERE sub.id = p.user_id
  AND (p.full_name IS NULL OR p.full_name = '')
  AND sub.name IS NOT NULL;

UPDATE public.profiles p
SET phone = sub.phone
FROM (
  SELECT u.id,
         NULLIF(TRIM(COALESCE(
           u.raw_user_meta_data->>'phone',
           u.raw_user_meta_data->>'phone_number',
           u.raw_user_meta_data->>'phoneNumber'
         )), '') AS phone
  FROM auth.users u
) sub
WHERE sub.id = p.user_id
  AND (p.phone IS NULL OR p.phone = '')
  AND sub.phone IS NOT NULL;
