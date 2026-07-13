-- Make wallet credits/debits idempotent to stop double-processing when the
-- same event is delivered more than once (Paystack retries webhooks, and a
-- webhook can be replayed). Without this, a replayed `charge.success` credits
-- the buyer's wallet twice.
--
-- Idempotency is OPT-IN via `p_idempotent`. Only callers whose reference is
-- guaranteed unique per real-world event (e.g. the Paystack transaction
-- reference for a wallet top-up) should pass TRUE. The pay-with-wallet debit
-- path intentionally leaves it FALSE, because it reuses `order_<id>` /
-- `refund_<id>` references across legitimate retries and must NOT be
-- short-circuited.
--
-- The existence check runs while the caller holds the wallet row lock
-- (`SELECT ... FOR UPDATE`), so check-then-insert is atomic per user: two
-- concurrent deliveries for the same user serialize, and the second observes
-- the first's transaction row and returns `already_processed = true`.

-- Fast lookup for the idempotency existence check.
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_reference
  ON public.wallet_transactions (wallet_id, reference)
  WHERE reference IS NOT NULL;

-- Drop the old 5-arg version so the new signature (with p_idempotent) is the
-- only overload — avoids PostgREST "function is not unique" ambiguity. All
-- existing callers pass ≤5 named args and keep working (p_idempotent defaults
-- to false).
DROP FUNCTION IF EXISTS public.update_wallet_balance(uuid, numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_idempotent BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
  v_existing_id UUID;
BEGIN
  -- Lock the wallet row for update. This also serializes concurrent calls
  -- for the same user, which is what makes the idempotency check below safe.
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Idempotency guard: if this reference was already applied, return the
  -- current balance without moving money again.
  IF p_idempotent AND p_reference IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.wallet_transactions
    WHERE wallet_id = v_wallet_id
      AND reference = p_reference
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      SELECT balance INTO v_new_balance FROM public.wallets WHERE id = v_wallet_id;
      RETURN json_build_object(
        'success', true,
        'already_processed', true,
        'new_balance', v_new_balance,
        'transaction_id', v_existing_id
      );
    END IF;
  END IF;

  -- For debits, check sufficient balance
  IF p_type = 'debit' THEN
    SELECT balance INTO v_new_balance FROM public.wallets WHERE id = v_wallet_id;
    IF v_new_balance < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
  END IF;

  -- Update balance atomically
  UPDATE public.wallets
  SET balance = CASE
    WHEN p_type = 'credit' THEN balance + p_amount
    WHEN p_type = 'debit' THEN balance - p_amount
    ELSE balance
  END,
  updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, description, reference)
  VALUES (v_wallet_id, p_amount, p_type, p_description, p_reference)
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'already_processed', false,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;
