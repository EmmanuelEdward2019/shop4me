-- ============================================================
-- One-time fix: Approve test users for Google Play Console
-- test_agent@shop4meng.com  → agent role
-- test_rider@shop4meng.com  → rider role
-- This bypasses the admin-approval UI for these two accounts only.
-- ============================================================

DO $$
DECLARE
  v_agent_uid    uuid;
  v_rider_uid    uuid;
  v_agent_app_id uuid;
  v_rider_app_id uuid;
BEGIN

  -- ── 1. Resolve user IDs from auth.users ─────────────────────────────────────
  SELECT id INTO v_agent_uid FROM auth.users WHERE email = 'test_agent@shop4meng.com';
  SELECT id INTO v_rider_uid FROM auth.users WHERE email = 'test_rider@shop4meng.com';

  IF v_agent_uid IS NULL THEN
    RAISE WARNING 'test_agent@shop4meng.com not found in auth.users – skipping agent approval';
  END IF;

  IF v_rider_uid IS NULL THEN
    RAISE WARNING 'test_rider@shop4meng.com not found in auth.users – skipping rider approval';
  END IF;

  -- ── 2. Approve agent application ────────────────────────────────────────────
  IF v_agent_uid IS NOT NULL THEN

    -- Find any existing application for this user
    SELECT id INTO v_agent_app_id
    FROM public.agent_applications
    WHERE user_id = v_agent_uid
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_agent_app_id IS NOT NULL THEN
      -- Update existing application to approved
      UPDATE public.agent_applications
      SET status      = 'approved',
          role_type   = 'shopping_agent',
          reviewed_at = now(),
          admin_notes = 'Auto-approved for Google Play Console test account'
      WHERE id = v_agent_app_id;
    ELSE
      -- No application found: insert a synthetic approved one
      INSERT INTO public.agent_applications (
        user_id, full_name, email, phone, date_of_birth,
        address, city, state,
        role_type, id_type, id_number,
        bank_name, account_number, account_name,
        status, reviewed_at, admin_notes
      ) VALUES (
        v_agent_uid,
        'Test Agent',
        'test_agent@shop4meng.com',
        '08000000001',
        '1990-01-01',
        '1 Test Street',
        'Lagos',
        'Lagos',
        'shopping_agent',
        'nin',
        'TEST-AGENT-NIN',
        'Test Bank',
        '0000000001',
        'Test Agent',
        'approved',
        now(),
        'Synthetic application – auto-approved for Google Play Console test account'
      );
    END IF;

    -- Ensure user_roles has the 'agent' role (replace buyer if present)
    UPDATE public.user_roles
    SET role = 'agent'
    WHERE user_id = v_agent_uid AND role = 'buyer';

    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_agent_uid, 'agent')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RAISE NOTICE 'test_agent@shop4meng.com → approved as agent ✓';
  END IF;

  -- ── 3. Approve rider application ────────────────────────────────────────────
  IF v_rider_uid IS NOT NULL THEN

    SELECT id INTO v_rider_app_id
    FROM public.agent_applications
    WHERE user_id = v_rider_uid
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_rider_app_id IS NOT NULL THEN
      UPDATE public.agent_applications
      SET status      = 'approved',
          role_type   = 'rider',
          reviewed_at = now(),
          admin_notes = 'Auto-approved for Google Play Console test account'
      WHERE id = v_rider_app_id;
    ELSE
      INSERT INTO public.agent_applications (
        user_id, full_name, email, phone, date_of_birth,
        address, city, state,
        role_type, id_type, id_number,
        bank_name, account_number, account_name,
        status, reviewed_at, admin_notes
      ) VALUES (
        v_rider_uid,
        'Test Rider',
        'test_rider@shop4meng.com',
        '08000000002',
        '1990-01-01',
        '2 Test Street',
        'Lagos',
        'Lagos',
        'rider',
        'nin',
        'TEST-RIDER-NIN',
        'Test Bank',
        '0000000002',
        'Test Rider',
        'approved',
        now(),
        'Synthetic application – auto-approved for Google Play Console test account'
      );
    END IF;

    -- Ensure user_roles has the 'rider' role (replace buyer if present)
    UPDATE public.user_roles
    SET role = 'rider'
    WHERE user_id = v_rider_uid AND role = 'buyer';

    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_rider_uid, 'rider')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RAISE NOTICE 'test_rider@shop4meng.com → approved as rider ✓';
  END IF;

END $$;
