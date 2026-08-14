-- Scalability: accurate all-time revenue summary for the admin Payments page.
-- The page loads only the most recent 500 rows for its lists/charts, so its
-- summary tiles previously reflected just those 500. This RPC computes the
-- true totals in the DB (admin-gated). Replicates the page's existing
-- semantics: "Paystack Revenue" = all successful payments (incl. wallet
-- top-ups, which are payment rows), wallet credits/debits from transactions.

CREATE OR REPLACE FUNCTION public.admin_payment_summary()
RETURNS TABLE (
  paystack_revenue        numeric,
  wallet_credits          numeric,
  wallet_debits           numeric,
  paystack_success_count  bigint,
  wallet_credit_count     bigint,
  wallet_debit_count      bigint
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
    COALESCE((SELECT sum(amount) FROM public.payments WHERE status = 'success'), 0)::numeric,
    COALESCE((SELECT sum(amount) FROM public.wallet_transactions WHERE type = 'credit'), 0)::numeric,
    COALESCE((SELECT sum(amount) FROM public.wallet_transactions WHERE type = 'debit'), 0)::numeric,
    (SELECT count(*) FROM public.payments WHERE status = 'success'),
    (SELECT count(*) FROM public.wallet_transactions WHERE type = 'credit'),
    (SELECT count(*) FROM public.wallet_transactions WHERE type = 'debit');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_payment_summary() TO authenticated;
