-- Defer full registration until the email is CONFIRMED.
--
-- Problem this fixes:
--   1. `handle_new_user` ran AFTER INSERT on auth.users and immediately created
--      profiles + user_roles + wallets — even for signups that never confirmed
--      their email. A mistyped/abandoned signup therefore "occupied" the email
--      and left orphaned rows.
--   2. Users signing up with an already-registered email received no feedback
--      (Supabase's email-enumeration protection returns a silent success and
--      sends no email), so they waited forever for an OTP/link that never came.
--
-- Fixes here:
--   A. Provision (profiles/user_roles/wallets) ONLY once auth.users.email_confirmed_at
--      is set — on the confirmation UPDATE, or on INSERT for users that arrive
--      already-confirmed (admin.createUser / OAuth). Idempotent: never double-creates.
--   B. `check_email_status(email)` — a pre-signup check the client calls to block
--      an already-registered email with a clear message instead of a silent no-op.
--   C. Hourly cleanup of unconfirmed accounts older than 24h (= the confirm-link
--      lifetime), so a mistyped email frees itself and can be re-used.

-- ── A. Confirmation-gated, idempotent provisioning ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role;
  v_meta_role TEXT;
BEGIN
  -- Only provision once the email is confirmed. Unconfirmed signups (still
  -- awaiting the email link) get NO profile/role/wallet — so an abandoned or
  -- mistyped signup leaves nothing behind and is cleaned up by (C).
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotent guard: this function runs on both the INSERT (users created
  -- already-confirmed via admin API / OAuth) and the confirmation UPDATE. Make
  -- sure we provision at most once per user.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

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
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Role from signup metadata (unchanged mapping).
  v_meta_role := NEW.raw_user_meta_data->>'role';
  IF v_meta_role = 'delivery_rider' THEN
    v_role := 'rider'::app_role;
  ELSIF v_meta_role = 'shopping_agent' OR v_meta_role = 'both' THEN
    v_role := 'agent'::app_role;
  ELSE
    v_role := 'buyer'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0.00)
    ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Keep the existing AFTER INSERT trigger (on_auth_user_created) — it now only
-- provisions when the inserted row is already confirmed. Add the confirmation
-- trigger for the normal web/email flow (email_confirmed_at: NULL -> set).
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- ── B. Pre-signup email status check ─────────────────────────────────────────
-- Returns 'confirmed' | 'unconfirmed' | 'none' | 'invalid'. The signup UI calls
-- this BEFORE auth.signUp so an already-registered email is blocked with a clear
-- "please log in" message instead of the silent success that enumeration
-- protection produces. NOTE: this intentionally discloses whether an email is
-- registered (a product requirement) — consider a rate limit if abuse appears.
CREATE OR REPLACE FUNCTION public.check_email_status(p_email text)
RETURNS text AS $$
DECLARE
  v_email    text;
  v_exists   boolean;
  v_confirmed boolean;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));

  -- Basic server-side format validation (defence in depth; the client also
  -- validates). Rejects empties, over-length, and anything that isn't x@y.z.
  IF v_email = ''
     OR length(v_email) > 254
     OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RETURN 'invalid';
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email),
    EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email AND email_confirmed_at IS NOT NULL)
  INTO v_exists, v_confirmed;

  IF v_confirmed THEN
    RETURN 'confirmed';
  ELSIF v_exists THEN
    RETURN 'unconfirmed';
  ELSE
    RETURN 'none';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.check_email_status(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_email_status(text) TO anon, authenticated;

-- ── C. Auto-delete abandoned unconfirmed signups ─────────────────────────────
-- Deletes auth.users that were never confirmed and are older than 24h (the
-- confirm-link lifetime). Cascades via FK ON DELETE CASCADE — but deferred
-- provisioning means these rows have no profile/role/wallet anyway.
CREATE OR REPLACE FUNCTION public.delete_abandoned_unconfirmed_signups()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM auth.users u
    WHERE u.email_confirmed_at IS NULL
      AND u.created_at < now() - interval '24 hours'
      -- Belt-and-braces: never delete an account that somehow carries real data.
      -- An unconfirmed user cannot sign in, so these should always be empty —
      -- but this makes the destructive job provably safe.
      AND NOT EXISTS (SELECT 1 FROM public.orders o  WHERE o.user_id = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.wallets w
        WHERE w.user_id = u.id AND COALESCE(w.balance, 0) > 0
      )
    RETURNING u.id
  )
  SELECT count(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

REVOKE ALL ON FUNCTION public.delete_abandoned_unconfirmed_signups() FROM public;

-- Run hourly. Unschedule any prior definition first so re-runs are idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-abandoned-unconfirmed-signups') THEN
    PERFORM cron.unschedule('delete-abandoned-unconfirmed-signups');
  END IF;
  PERFORM cron.schedule(
    'delete-abandoned-unconfirmed-signups',
    '0 * * * *',
    $cron$SELECT public.delete_abandoned_unconfirmed_signups();$cron$
  );
END $$;
