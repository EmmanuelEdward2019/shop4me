-- =============================================================================
-- Rider Earnings & Withdrawal System
-- Flow: rider completes delivery → earnings auto-created → available 6am next day
--       rider requests withdrawal → admin transfers → rider confirms receipt
-- RUN IN SUPABASE DASHBOARD → SQL Editor
-- =============================================================================

-- ─── RIDER WITHDRAWALS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rider_withdrawals (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id       uuid        NOT NULL,
  amount         numeric     NOT NULL,
  bank_name      text,
  account_name   text,
  account_number text,
  status         text        NOT NULL DEFAULT 'pending',  -- pending | transferred | confirmed
  requested_at   timestamptz NOT NULL DEFAULT now(),
  transferred_at timestamptz,
  confirmed_at   timestamptz
);

ALTER TABLE public.rider_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rider can read own withdrawals"
  ON public.rider_withdrawals FOR SELECT
  USING (rider_id = auth.uid());

CREATE POLICY "Rider can insert own withdrawals"
  ON public.rider_withdrawals FOR INSERT
  WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Rider can confirm own withdrawals"
  ON public.rider_withdrawals FOR UPDATE
  USING (rider_id = auth.uid());

CREATE POLICY "Admins can manage all withdrawals"
  ON public.rider_withdrawals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─── RIDER EARNINGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rider_earnings (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id      uuid        NOT NULL,
  order_id      uuid        NOT NULL REFERENCES public.orders(id),
  delivery_fee  numeric     NOT NULL DEFAULT 0,
  platform_cut  numeric     NOT NULL DEFAULT 0,   -- 15 %
  rider_amount  numeric     NOT NULL DEFAULT 0,   -- 85 %
  available_at  timestamptz NOT NULL,              -- 6 am next day (Nigeria / UTC+1)
  status        text        NOT NULL DEFAULT 'pending',  -- pending | withdraw_requested | paid
  withdrawal_id uuid        REFERENCES public.rider_withdrawals(id),
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rider can read own earnings"
  ON public.rider_earnings FOR SELECT
  USING (rider_id = auth.uid());

CREATE POLICY "Admins can read all earnings"
  ON public.rider_earnings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update earnings"
  ON public.rider_earnings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role (trigger) needs to insert
CREATE POLICY "Service role can insert earnings"
  ON public.rider_earnings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update earnings"
  ON public.rider_earnings FOR UPDATE
  USING (true);

-- ─── TRIGGER: create earnings when rider_alert → completed ────────────────────
CREATE OR REPLACE FUNCTION public.create_rider_earning_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_fee numeric;
  v_platform_cut numeric;
  v_rider_amount numeric;
  v_available_at timestamptz;
BEGIN
  -- Fire only when status transitions to 'completed' with a rider assigned
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.rider_id IS NOT NULL
  THEN
    -- Get the delivery fee from the linked order
    SELECT COALESCE(delivery_fee, 0)
    INTO v_delivery_fee
    FROM public.orders
    WHERE id = NEW.order_id;

    v_platform_cut := ROUND(v_delivery_fee * 0.15, 2);
    v_rider_amount := ROUND(v_delivery_fee * 0.85, 2);

    -- 6 am next calendar day in Africa/Lagos (UTC+1)
    v_available_at :=
      (date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos')
        + interval '1 day'
        + interval '6 hours'
      ) AT TIME ZONE 'Africa/Lagos';

    INSERT INTO public.rider_earnings
      (rider_id, order_id, delivery_fee, platform_cut, rider_amount, available_at, completed_at)
    VALUES
      (NEW.rider_id, NEW.order_id, v_delivery_fee, v_platform_cut, v_rider_amount, v_available_at, now())
    ON CONFLICT (order_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_rider_alert_completed ON public.rider_alerts;
CREATE TRIGGER on_rider_alert_completed
  AFTER UPDATE ON public.rider_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_rider_earning_on_completion();

-- ─── RPC: request_rider_withdrawal ───────────────────────────────────────────
-- Atomically: creates withdrawal row and marks all available earnings as withdraw_requested
CREATE OR REPLACE FUNCTION public.request_rider_withdrawal()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider_id     uuid := auth.uid();
  v_total        numeric;
  v_bank_name    text;
  v_account_name text;
  v_account_num  text;
  v_withdrawal_id uuid;
BEGIN
  -- Sum available earnings (pending and past the available_at window)
  SELECT COALESCE(SUM(rider_amount), 0)
  INTO v_total
  FROM public.rider_earnings
  WHERE rider_id = v_rider_id
    AND status = 'pending'
    AND available_at <= NOW();

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No available earnings to withdraw';
  END IF;

  -- Pull bank details from agent_applications
  SELECT bank_name, account_name, account_number
  INTO v_bank_name, v_account_name, v_account_num
  FROM public.agent_applications
  WHERE user_id = v_rider_id;

  -- Create withdrawal record
  INSERT INTO public.rider_withdrawals
    (rider_id, amount, bank_name, account_name, account_number, status)
  VALUES
    (v_rider_id, v_total, v_bank_name, v_account_name, v_account_num, 'pending')
  RETURNING id INTO v_withdrawal_id;

  -- Link and mark earnings
  UPDATE public.rider_earnings
  SET status = 'withdraw_requested',
      withdrawal_id = v_withdrawal_id
  WHERE rider_id = v_rider_id
    AND status = 'pending'
    AND available_at <= NOW();

  RETURN v_withdrawal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_rider_withdrawal() TO authenticated;

-- ─── RPC: confirm_withdrawal_receipt ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_withdrawal_receipt(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify ownership and state
  IF NOT EXISTS (
    SELECT 1 FROM public.rider_withdrawals
    WHERE id = p_withdrawal_id
      AND rider_id = auth.uid()
      AND status = 'transferred'
  ) THEN
    RAISE EXCEPTION 'Withdrawal not found or not yet transferred';
  END IF;

  UPDATE public.rider_withdrawals
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = p_withdrawal_id;

  UPDATE public.rider_earnings
  SET status = 'paid'
  WHERE withdrawal_id = p_withdrawal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_withdrawal_receipt(uuid) TO authenticated;
