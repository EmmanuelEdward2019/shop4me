-- Self-service referral payout: let a referrer move their EARNED (qualified,
-- unpaid) referral rewards into their Shop4Me wallet on demand, instead of
-- waiting for the Friday cron / admin payout. Marketers are excluded (offline).
CREATE OR REPLACE FUNCTION public.request_referral_payout()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_uid uuid := auth.uid();
  v_paid_count int := 0;
  v_paid_total numeric := 0;
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = v_uid AND p.is_marketer = true) THEN
    RETURN json_build_object('success', false, 'error', 'Marketer rewards are paid offline');
  END IF;

  FOR r IN
    SELECT ref.id, COALESCE(ref.reward_amount, 0) AS amount
    FROM public.referrals ref
    WHERE ref.referrer_id = v_uid
      AND ref.status = 'earned'
      AND COALESCE(ref.reward_amount, 0) > 0
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.wallets (user_id, balance)
    SELECT v_uid, 0
    WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = v_uid);

    v_res := public.update_wallet_balance(
      v_uid, r.amount, 'credit', 'Referral reward', 'referral_' || r.id::text, true);

    IF COALESCE((v_res->>'success')::boolean, false) THEN
      UPDATE public.referrals SET status = 'paid', paid_at = now() WHERE id = r.id;
      v_paid_count := v_paid_count + 1;
      v_paid_total := v_paid_total + r.amount;
    END IF;
  END LOOP;

  IF v_paid_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No earnings available to withdraw');
  END IF;
  RETURN json_build_object('success', true, 'paid_count', v_paid_count, 'paid_total', v_paid_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_referral_payout() TO authenticated;
