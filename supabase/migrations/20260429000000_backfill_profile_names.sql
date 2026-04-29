-- =============================================================================
-- Backfill profiles.full_name from:
--   1. auth.users raw_user_meta_data (for all users whose name is missing)
--   2. agent_applications.full_name (for agents/riders whose profile is blank)
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- Step 1: Sync full_name from auth metadata for any profile that is missing a name
UPDATE public.profiles p
SET full_name = (
  SELECT raw_user_meta_data->>'full_name'
  FROM auth.users u
  WHERE u.id = p.user_id
    AND raw_user_meta_data->>'full_name' IS NOT NULL
    AND raw_user_meta_data->>'full_name' <> ''
)
WHERE (p.full_name IS NULL OR p.full_name = '')
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.user_id
      AND raw_user_meta_data->>'full_name' IS NOT NULL
      AND raw_user_meta_data->>'full_name' <> ''
  );

-- Step 2: For agent/rider profiles still missing a name, use agent_applications
UPDATE public.profiles p
SET full_name = a.full_name
FROM public.agent_applications a
WHERE a.user_id = p.user_id
  AND a.full_name IS NOT NULL
  AND a.full_name <> ''
  AND (p.full_name IS NULL OR p.full_name = '');
