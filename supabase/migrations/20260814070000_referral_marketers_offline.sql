-- Marketers are Shop4Me's own promoters: they use the same Refer & Earn feature,
-- but the ₦ reward does NOT apply to them — they are rewarded OFFLINE. Their
-- qualifying referrals are still tracked/counted so an admin knows what to pay,
-- but they never accrue a wallet balance and are excluded from the payout.

-- 1. Award: a marketer's qualifying referral is recorded with amount 0.
CREATE OR REPLACE FUNCTION public.award_referral_on_first_order()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enabled boolean;
  v_reward  numeric;
BEGIN
  IF NEW.status IN ('delivered', 'completed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT enabled, reward_amount INTO v_enabled, v_reward
    FROM public.referral_settings WHERE id = 1;

    IF COALESCE(v_enabled, false) THEN
      UPDATE public.referrals r
      SET status = 'earned',
          reward_amount = CASE
            WHEN COALESCE((SELECT p.is_marketer FROM public.profiles p WHERE p.user_id = r.referrer_id), false)
              THEN 0
            ELSE COALESCE(v_reward, 1000)
          END,
          qualifying_order_id = NEW.id,
          earned_at = now()
      WHERE r.referred_user_id = NEW.user_id AND r.status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 2. Payout: never credit marketers (offline) — only non-marketer, non-zero rewards.
CREATE OR REPLACE FUNCTION public.run_referral_payout()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_paid_count int := 0; v_paid_total numeric := 0; v_res json;
BEGIN
  FOR r IN
    SELECT ref.id, ref.referrer_id, COALESCE(ref.reward_amount, 1000) AS amount
    FROM public.referrals ref
    WHERE ref.status = 'earned'
      AND COALESCE(ref.reward_amount, 0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.user_id = ref.referrer_id AND p.is_marketer = true)
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.wallets (user_id, balance)
    SELECT r.referrer_id, 0
    WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = r.referrer_id);

    v_res := public.update_wallet_balance(
      r.referrer_id, r.amount, 'credit', 'Referral reward', 'referral_' || r.id::text, true);

    IF COALESCE((v_res->>'success')::boolean, false) THEN
      UPDATE public.referrals SET status = 'paid', paid_at = now() WHERE id = r.id;
      v_paid_count := v_paid_count + 1;
      v_paid_total := v_paid_total + r.amount;
    END IF;
  END LOOP;
  RETURN json_build_object('success', true, 'paid_count', v_paid_count, 'paid_total', v_paid_total);
END; $$;

-- 3. Admin list: show ALL marketers (even with 0 referrals yet) so they can be
--    managed/rewarded; general customers still appear only once they've referred.
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id, p.full_name, p.email, p.referral_code, p.is_marketer,
    count(r.id),
    count(r.id) FILTER (WHERE r.status = 'pending'),
    count(r.id) FILTER (WHERE r.status = 'earned'),
    count(r.id) FILTER (WHERE r.status = 'paid'),
    COALESCE(sum(r.reward_amount) FILTER (WHERE r.status = 'earned'), 0),
    COALESCE(sum(r.reward_amount) FILTER (WHERE r.status = 'paid'), 0)
  FROM public.profiles p
  LEFT JOIN public.referrals r ON r.referrer_id = p.user_id
  WHERE p.is_marketer = p_marketers
  GROUP BY p.user_id, p.full_name, p.email, p.referral_code, p.is_marketer
  HAVING (p_marketers = true OR count(r.id) > 0)  -- marketers always listed; general only if they referred
  ORDER BY count(r.id) FILTER (WHERE r.status = 'earned') DESC, count(r.id) DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_referrals(boolean) TO authenticated;
