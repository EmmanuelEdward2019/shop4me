-- Backfill profiles.phone from every plausible source.
--
-- The previous migration filled names but not phones, because phones don't live
-- in the auth metadata keys it checked:
--   • Agents/riders submit their phone in agent_applications.phone (a REQUIRED
--     field) — it was never copied into profiles.
--   • Buyers' phone (if captured) may sit in auth.users.phone (the native
--     column) or a metadata key we hadn't tried.
--
-- Only fills MISSING values; never overwrites. Ends with a read-only diagnostic
-- so we can see what (if anything) is still missing and under which metadata key
-- any remaining phones are stored.

-- ── 1. Agents / riders → from their application (most reliable source) ───────
UPDATE public.profiles p
SET phone = sub.phone
FROM (
  SELECT DISTINCT ON (user_id) user_id,
         NULLIF(TRIM(phone), '') AS phone
  FROM public.agent_applications
  WHERE user_id IS NOT NULL
    AND phone IS NOT NULL
    AND TRIM(phone) <> ''
  ORDER BY user_id, created_at DESC NULLS LAST
) sub
WHERE sub.user_id = p.user_id
  AND (p.phone IS NULL OR p.phone = '')
  AND sub.phone IS NOT NULL;

-- ── 2. Everyone else → auth.users native phone column + expanded metadata ────
UPDATE public.profiles p
SET phone = sub.phone
FROM (
  SELECT u.id,
         NULLIF(TRIM(COALESCE(
           NULLIF(u.phone, ''),
           u.raw_user_meta_data->>'phone',
           u.raw_user_meta_data->>'phone_number',
           u.raw_user_meta_data->>'phoneNumber',
           u.raw_user_meta_data->>'phoneNo',
           u.raw_user_meta_data->>'phone_no',
           u.raw_user_meta_data->>'mobile',
           u.raw_user_meta_data->>'mobile_number',
           u.raw_user_meta_data->>'mobileNumber',
           u.raw_user_meta_data->>'msisdn',
           u.raw_user_meta_data->>'whatsapp',
           u.raw_user_meta_data->>'whatsapp_number'
         )), '') AS phone
  FROM auth.users u
) sub
WHERE sub.id = p.user_id
  AND (p.phone IS NULL OR p.phone = '')
  AND sub.phone IS NOT NULL;

-- ── 3. Diagnostic (read-only) ───────────────────────────────────────────────
DO $$
DECLARE
  v_total   int;
  v_missing int;
  v_native  int;
  v_keys    text;
BEGIN
  SELECT count(*) INTO v_total   FROM public.profiles;
  SELECT count(*) INTO v_missing FROM public.profiles WHERE phone IS NULL OR phone = '';
  SELECT count(*) INTO v_native  FROM auth.users WHERE phone IS NOT NULL AND phone <> '';
  SELECT string_agg(DISTINCT k, ', ') INTO v_keys
  FROM auth.users u, LATERAL jsonb_object_keys(COALESCE(u.raw_user_meta_data, '{}'::jsonb)) k;

  RAISE NOTICE '[phone-backfill] profiles total=%, still missing phone=%', v_total, v_missing;
  RAISE NOTICE '[phone-backfill] auth.users with native phone set=%', v_native;
  RAISE NOTICE '[phone-backfill] distinct auth metadata keys present: %', v_keys;
END $$;
