-- ============================================================================
-- Referral system: "Refer & Earn ₦1,000".
--   * Every customer gets a unique referral code.
--   * A new user who signs up with a code and completes their FIRST order earns
--     the referrer a one-time reward (default ₦1,000) — once per referred user.
--   * Rewards accrue as 'earned' and are paid out weekly (Friday) into the
--     referrer's Shop4Me wallet; admins can also trigger a payout on demand.
--   * A backend on/off switch (referral_settings.enabled) controls the whole
--     feature; when off, no codes can be applied and nothing accrues.
--   * Admins can tag customers as "marketers" to separate Shop4Me's own
--     promoters from ordinary referrers.
-- Agents/riders are unaffected — this is purely a customer-side feature.
-- ============================================================================

-- ── Settings (single row) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id            int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled       boolean NOT NULL DEFAULT false,
  reward_amount numeric NOT NULL DEFAULT 1000,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.referral_settings (id, enabled, reward_amount)
VALUES (1, false, 1000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read referral settings" ON public.referral_settings;
CREATE POLICY "Anyone can read referral settings"
  ON public.referral_settings FOR SELECT USING (true);
-- Writes only via SECURITY DEFINER admin RPC below (no direct write policy).

-- ── Profile columns: code, marketer flag, who referred them ─────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_marketer   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique short code generator.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists int;
BEGIN
  LOOP
    v_code := upper(substring(md5(gen_random_uuid()::text) from 1 for 8));
    SELECT count(*) INTO v_exists FROM public.profiles WHERE referral_code = v_code;
    EXIT WHEN v_exists = 0;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Backfill existing profiles, then auto-assign on insert.
UPDATE public.profiles SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.set_referral_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code_on_insert();

-- ── Referrals ledger ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id   uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'pending', -- pending | earned | paid
  reward_amount      numeric,
  qualifying_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  earned_at          timestamptz,
  paid_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id, status);
CREATE INDEX IF NOT EXISTS referrals_status_idx   ON public.referrals (status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Referrer sees own referrals" ON public.referrals;
CREATE POLICY "Referrer sees own referrals"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- All writes go through SECURITY DEFINER functions below.

-- ── A new user registers the code that referred them ────────────────────────
-- Called by the referred user right after signup. Validates the feature is on,
-- the code exists, isn't their own, and they haven't already been referred.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_enabled  boolean;
  v_referrer uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT enabled INTO v_enabled FROM public.referral_settings WHERE id = 1;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN json_build_object('success', false, 'error', 'Referrals are not active');
  END IF;

  SELECT user_id INTO v_referrer FROM public.profiles
  WHERE referral_code = upper(trim(p_code));
  IF v_referrer IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;
  IF v_referrer = v_uid THEN
    RETURN json_build_object('success', false, 'error', 'You cannot refer yourself');
  END IF;

  -- Only if this user has never been referred before.
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_uid) THEN
    RETURN json_build_object('success', false, 'error', 'Referral already recorded');
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, status)
  VALUES (v_referrer, v_uid, 'pending');

  UPDATE public.profiles SET referred_by = v_referrer WHERE user_id = v_uid;

  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

-- ── Award the reward on the referred user's first completed order ───────────
CREATE OR REPLACE FUNCTION public.award_referral_on_first_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
  v_reward  numeric;
BEGIN
  IF NEW.status IN ('delivered', 'completed')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    SELECT enabled, reward_amount INTO v_enabled, v_reward
    FROM public.referral_settings WHERE id = 1;

    IF COALESCE(v_enabled, false) THEN
      -- Flip this buyer's pending referral (if any) to earned. UNIQUE on
      -- referred_user_id + the pending filter means this fires at most once.
      UPDATE public.referrals
      SET status = 'earned',
          reward_amount = COALESCE(v_reward, 1000),
          qualifying_order_id = NEW.id,
          earned_at = now()
      WHERE referred_user_id = NEW.user_id
        AND status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_award_referral ON public.orders;
CREATE TRIGGER trg_award_referral
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.award_referral_on_first_order();

-- ── Payout: credit earned referrals into referrers' wallets ─────────────────
-- Internal worker (no auth check) — called by the admin RPC and by pg_cron.
CREATE OR REPLACE FUNCTION public.run_referral_payout()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r           record;
  v_paid_count int := 0;
  v_paid_total numeric := 0;
  v_res        json;
BEGIN
  FOR r IN
    SELECT id, referrer_id, COALESCE(reward_amount, 1000) AS amount
    FROM public.referrals
    WHERE status = 'earned'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Ensure the referrer has a wallet (no dependency on a unique constraint).
    INSERT INTO public.wallets (user_id, balance)
    SELECT r.referrer_id, 0
    WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = r.referrer_id);

    -- Idempotent credit keyed on the referral id.
    v_res := public.update_wallet_balance(
      r.referrer_id, r.amount, 'credit',
      'Referral reward', 'referral_' || r.id::text, true
    );

    IF COALESCE((v_res->>'success')::boolean, false) THEN
      UPDATE public.referrals
      SET status = 'paid', paid_at = now()
      WHERE id = r.id;
      v_paid_count := v_paid_count + 1;
      v_paid_total := v_paid_total + r.amount;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'paid_count', v_paid_count, 'paid_total', v_paid_total);
END;
$$;

-- Admin-triggered payout (gated).
CREATE OR REPLACE FUNCTION public.admin_run_referral_payout()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  RETURN public.run_referral_payout();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_run_referral_payout() TO authenticated;

-- ── Admin: settings, marketer tagging, and the two referral lists ───────────
CREATE OR REPLACE FUNCTION public.admin_set_referral_settings(p_enabled boolean, p_reward_amount numeric DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.referral_settings
  SET enabled = p_enabled,
      reward_amount = COALESCE(p_reward_amount, reward_amount),
      updated_at = now()
  WHERE id = 1;
  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_referral_settings(boolean, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_marketer(p_user_id uuid, p_is_marketer boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.profiles SET is_marketer = p_is_marketer WHERE user_id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_marketer(uuid, boolean) TO authenticated;

-- One row per referrer, split by marketer flag, with aggregate earnings.
CREATE OR REPLACE FUNCTION public.admin_list_referrals(p_marketers boolean DEFAULT false)
RETURNS TABLE (
  referrer_id     uuid,
  full_name       text,
  email           text,
  referral_code   text,
  is_marketer     boolean,
  total_referred  bigint,
  pending_count   bigint,
  earned_count    bigint,
  paid_count      bigint,
  earned_amount   numeric,
  paid_amount     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.referral_code,
    p.is_marketer,
    count(r.id),
    count(r.id) FILTER (WHERE r.status = 'pending'),
    count(r.id) FILTER (WHERE r.status = 'earned'),
    count(r.id) FILTER (WHERE r.status = 'paid'),
    COALESCE(sum(r.reward_amount) FILTER (WHERE r.status = 'earned'), 0),
    COALESCE(sum(r.reward_amount) FILTER (WHERE r.status = 'paid'), 0)
  FROM public.profiles p
  JOIN public.referrals r ON r.referrer_id = p.user_id
  WHERE p.is_marketer = p_marketers
  GROUP BY p.user_id, p.full_name, p.email, p.referral_code, p.is_marketer
  ORDER BY count(r.id) FILTER (WHERE r.status = 'earned') DESC, count(r.id) DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_referrals(boolean) TO authenticated;

-- ── Customer dashboard summary ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_referral_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_is_marketer boolean;
  v_enabled boolean;
  v_reward numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('enabled', false);
  END IF;

  SELECT referral_code, is_marketer INTO v_code, v_is_marketer
  FROM public.profiles WHERE user_id = v_uid;

  SELECT enabled, reward_amount INTO v_enabled, v_reward
  FROM public.referral_settings WHERE id = 1;

  RETURN json_build_object(
    'enabled', COALESCE(v_enabled, false),
    'reward_amount', COALESCE(v_reward, 1000),
    'referral_code', v_code,
    'is_marketer', COALESCE(v_is_marketer, false),
    'pending_count', (SELECT count(*) FROM public.referrals WHERE referrer_id = v_uid AND status = 'pending'),
    'earned_count',  (SELECT count(*) FROM public.referrals WHERE referrer_id = v_uid AND status = 'earned'),
    'paid_count',    (SELECT count(*) FROM public.referrals WHERE referrer_id = v_uid AND status = 'paid'),
    'earned_amount', (SELECT COALESCE(sum(reward_amount),0) FROM public.referrals WHERE referrer_id = v_uid AND status = 'earned'),
    'paid_amount',   (SELECT COALESCE(sum(reward_amount),0) FROM public.referrals WHERE referrer_id = v_uid AND status = 'paid')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_referral_summary() TO authenticated;

-- ── Weekly Friday payout via pg_cron (best-effort; admin can also trigger) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('referral-friday-payout')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'referral-friday-payout');
    PERFORM cron.schedule('referral-friday-payout', '0 9 * * 5', 'SELECT public.run_referral_payout();');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;
