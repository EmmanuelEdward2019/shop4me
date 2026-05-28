-- =============================================================================
-- Agent Earnings & Withdrawal System  +  Admin Force-Release Helpers
--
-- Mirrors the existing rider_earnings / rider_withdrawals flow (see
-- 20260430200000_rider_earnings.sql) for agents. Adds:
--   - public.agent_withdrawals table (status: pending | transferred | confirmed)
--   - request_agent_withdrawal() RPC
--   - confirm_agent_withdrawal_receipt(uuid) RPC
--   - admin_release_earnings(role, ids[]) RPC for unlocking stuck earnings
--   - Indexes on existing tables for history/filter queries
--
-- Strictly ADDITIVE: existing tables, policies, and RPCs are untouched.
-- The rider's available_at logic is left intentionally as-is — it is
-- correct (6am Lagos next day); the admin release RPC below covers
-- any one-off corrections an admin needs to make.
-- =============================================================================

-- ─── AGENT WITHDRAWALS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_withdrawals (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id       uuid        NOT NULL,
  amount         numeric     NOT NULL,
  bank_name      text,
  account_name   text,
  account_number text,
  status         text        NOT NULL DEFAULT 'pending',  -- pending | transferred | confirmed
  requested_at   timestamptz NOT NULL DEFAULT now(),
  transferred_at timestamptz,
  confirmed_at   timestamptz
);

ALTER TABLE public.agent_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent can read own withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Agent can read own withdrawals"
  ON public.agent_withdrawals FOR SELECT
  USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agent can insert own withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Agent can insert own withdrawals"
  ON public.agent_withdrawals FOR INSERT
  WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agent can confirm own withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Agent can confirm own withdrawals"
  ON public.agent_withdrawals FOR UPDATE
  USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all agent withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Admins can manage all agent withdrawals"
  ON public.agent_withdrawals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS agent_withdrawals_agent_status_idx
  ON public.agent_withdrawals (agent_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS agent_withdrawals_status_idx
  ON public.agent_withdrawals (status, requested_at DESC);

-- ─── Add withdrawal_id link to agent_earnings ────────────────────────────────
-- Mirrors rider_earnings.withdrawal_id so we can mark an earning as
-- "withdraw_requested" then "paid" through the same lifecycle.
ALTER TABLE public.agent_earnings
  ADD COLUMN IF NOT EXISTS withdrawal_id uuid REFERENCES public.agent_withdrawals(id),
  ADD COLUMN IF NOT EXISTS available_at  timestamptz;

-- Index for fast "available earnings" sum queries.
CREATE INDEX IF NOT EXISTS agent_earnings_agent_status_idx
  ON public.agent_earnings (agent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS rider_earnings_agent_status_idx
  ON public.rider_earnings (rider_id, status, completed_at DESC);

-- ─── RPC: request_agent_withdrawal ───────────────────────────────────────────
-- Sums available agent earnings (status='pending' and linked to a
-- delivered order) and creates a withdrawal request. Bank details come
-- from agent_applications.
CREATE OR REPLACE FUNCTION public.request_agent_withdrawal()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id     uuid := auth.uid();
  v_total        numeric;
  v_bank_name    text;
  v_account_name text;
  v_account_num  text;
  v_withdrawal_id uuid;
BEGIN
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sum available earnings: pending status AND the linked order is
  -- delivered (no point paying out on a still-open order). If
  -- `available_at` has been set on a row we also honour it.
  SELECT COALESCE(SUM(ae.amount), 0)
    INTO v_total
    FROM public.agent_earnings ae
    JOIN public.orders o ON o.id = ae.order_id
   WHERE ae.agent_id = v_agent_id
     AND ae.status = 'pending'
     AND o.status = 'delivered'
     AND (ae.available_at IS NULL OR ae.available_at <= NOW());

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No available earnings to withdraw';
  END IF;

  -- Pull bank details from agent_applications (same source riders use).
  SELECT bank_name, account_name, account_number
    INTO v_bank_name, v_account_name, v_account_num
    FROM public.agent_applications
   WHERE user_id = v_agent_id;

  INSERT INTO public.agent_withdrawals
    (agent_id, amount, bank_name, account_name, account_number, status)
  VALUES
    (v_agent_id, v_total, v_bank_name, v_account_name, v_account_num, 'pending')
  RETURNING id INTO v_withdrawal_id;

  -- Link and mark earnings as withdraw_requested.
  UPDATE public.agent_earnings ae
     SET status = 'withdraw_requested',
         withdrawal_id = v_withdrawal_id
   WHERE ae.agent_id = v_agent_id
     AND ae.status = 'pending'
     AND ae.order_id IN (
       SELECT id FROM public.orders WHERE status = 'delivered'
     )
     AND (ae.available_at IS NULL OR ae.available_at <= NOW());

  RETURN v_withdrawal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_agent_withdrawal() TO authenticated;

-- ─── RPC: confirm_agent_withdrawal_receipt ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_agent_withdrawal_receipt(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.agent_withdrawals
    WHERE id = p_withdrawal_id
      AND agent_id = auth.uid()
      AND status = 'transferred'
  ) THEN
    RAISE EXCEPTION 'Withdrawal not found or not yet transferred';
  END IF;

  UPDATE public.agent_withdrawals
     SET status = 'confirmed', confirmed_at = now()
   WHERE id = p_withdrawal_id;

  UPDATE public.agent_earnings
     SET status = 'paid', paid_at = COALESCE(paid_at, now())
   WHERE withdrawal_id = p_withdrawal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_agent_withdrawal_receipt(uuid) TO authenticated;

-- ─── RPC: admin_release_earnings ─────────────────────────────────────────────
-- Admin escape-hatch for unlocking earnings that should be available.
-- Sets `available_at` to NOW() for the listed earnings of either a
-- rider or an agent. Returns the count of rows updated.
CREATE OR REPLACE FUNCTION public.admin_release_earnings(
  p_role        text,             -- 'rider' | 'agent'
  p_user_id     uuid    DEFAULT NULL,
  p_earning_ids uuid[]  DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_role NOT IN ('rider', 'agent') THEN
    RAISE EXCEPTION 'p_role must be rider or agent';
  END IF;

  IF p_role = 'rider' THEN
    WITH updated AS (
      UPDATE public.rider_earnings
         SET available_at = NOW()
       WHERE status = 'pending'
         AND available_at > NOW()
         AND (p_user_id IS NULL OR rider_id = p_user_id)
         AND (p_earning_ids IS NULL OR id = ANY(p_earning_ids))
       RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM updated;
  ELSE
    WITH updated AS (
      UPDATE public.agent_earnings
         SET available_at = NOW()
       WHERE status = 'pending'
         AND (available_at IS NULL OR available_at > NOW())
         AND (p_user_id IS NULL OR agent_id = p_user_id)
         AND (p_earning_ids IS NULL OR id = ANY(p_earning_ids))
       RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM updated;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_release_earnings(text, uuid, uuid[]) TO authenticated;

-- ─── Realtime: publish agent_withdrawals so admin tab updates live ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_withdrawals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_withdrawals';
  END IF;
END $$;
