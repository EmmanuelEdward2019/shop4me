-- Buyer wallet → bank withdrawal. Unlike agents/riders (who withdraw earnings),
-- buyers cash out their WALLET balance, so requesting debits the wallet and the
-- buyer supplies bank details at request time. Lifecycle mirrors the others:
--   pending → transferred (admin paid the bank) → confirmed (buyer received).
-- Admin can cancel a not-yet-confirmed request, which refunds the wallet.

CREATE TABLE IF NOT EXISTS public.buyer_withdrawals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount         numeric NOT NULL,
  bank_name      text,
  account_name   text,
  account_number text,
  status         text NOT NULL DEFAULT 'pending',  -- pending | transferred | confirmed | cancelled
  requested_at   timestamptz NOT NULL DEFAULT now(),
  transferred_at timestamptz,
  confirmed_at   timestamptz
);
ALTER TABLE public.buyer_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyer reads own withdrawals" ON public.buyer_withdrawals;
CREATE POLICY "Buyer reads own withdrawals"
  ON public.buyer_withdrawals FOR SELECT
  USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage buyer withdrawals" ON public.buyer_withdrawals;
CREATE POLICY "Admins manage buyer withdrawals"
  ON public.buyer_withdrawals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Buyer writes go through the SECURITY DEFINER RPCs below (no buyer INSERT/UPDATE policy).

CREATE INDEX IF NOT EXISTS buyer_withdrawals_buyer_status_idx ON public.buyer_withdrawals (buyer_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS buyer_withdrawals_status_idx       ON public.buyer_withdrawals (status, requested_at DESC);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_withdrawals;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Request: debit the wallet, then create the withdrawal (pending).
CREATE OR REPLACE FUNCTION public.request_buyer_withdrawal(
  p_amount numeric, p_bank_name text, p_account_name text, p_account_number text
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_min numeric := 1000;
  v_res json;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_amount IS NULL OR p_amount < v_min THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is ₦' || v_min::int::text);
  END IF;
  IF COALESCE(TRIM(p_bank_name), '') = '' OR COALESCE(TRIM(p_account_number), '') = '' THEN
    RETURN json_build_object('success', false, 'error', 'Bank name and account number are required');
  END IF;
  IF EXISTS (SELECT 1 FROM public.buyer_withdrawals WHERE buyer_id = v_uid AND status IN ('pending', 'transferred')) THEN
    RETURN json_build_object('success', false, 'error', 'You already have a withdrawal in progress');
  END IF;

  INSERT INTO public.buyer_withdrawals (buyer_id, amount, bank_name, account_name, account_number, status)
  VALUES (v_uid, p_amount, TRIM(p_bank_name), TRIM(p_account_name), TRIM(p_account_number), 'pending')
  RETURNING id INTO v_id;

  -- Debit the wallet (checks sufficient balance; idempotent on the withdrawal id).
  v_res := public.update_wallet_balance(v_uid, p_amount, 'debit', 'Withdrawal to bank', 'buyer_wd_' || v_id::text, true);
  IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
    DELETE FROM public.buyer_withdrawals WHERE id = v_id;  -- roll back on insufficient balance / no wallet
    RETURN json_build_object('success', false, 'error', COALESCE(v_res->>'error', 'Insufficient wallet balance'));
  END IF;

  RETURN json_build_object('success', true, 'withdrawal_id', v_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.request_buyer_withdrawal(numeric, text, text, text) TO authenticated;

-- Buyer confirms they received the money.
CREATE OR REPLACE FUNCTION public.confirm_buyer_withdrawal_receipt(p_withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.buyer_withdrawals
    WHERE id = p_withdrawal_id AND buyer_id = auth.uid() AND status = 'transferred'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found or not yet transferred');
  END IF;
  UPDATE public.buyer_withdrawals SET status = 'confirmed', confirmed_at = now() WHERE id = p_withdrawal_id;
  RETURN json_build_object('success', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.confirm_buyer_withdrawal_receipt(uuid) TO authenticated;

-- Admin cancels a not-yet-confirmed request → refund the wallet.
CREATE OR REPLACE FUNCTION public.admin_cancel_buyer_withdrawal(p_withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.buyer_withdrawals;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO w FROM public.buyer_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF w.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not found'); END IF;
  IF w.status NOT IN ('pending', 'transferred') THEN
    RETURN json_build_object('success', false, 'error', 'This request can no longer be cancelled');
  END IF;
  PERFORM public.update_wallet_balance(w.buyer_id, w.amount, 'credit', 'Withdrawal reversed', 'buyer_wd_refund_' || w.id::text, true);
  UPDATE public.buyer_withdrawals SET status = 'cancelled' WHERE id = p_withdrawal_id;
  RETURN json_build_object('success', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_cancel_buyer_withdrawal(uuid) TO authenticated;
