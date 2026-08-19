-- Follow-up to 20260819000000.
--
-- That migration revoked EXECUTE on is_first_order_delivery_free from PUBLIC
-- and from `authenticated`, but Supabase grants EXECUTE on public-schema
-- functions to the `anon` and `authenticated` roles explicitly. Revoking from
-- PUBLIC does not remove an explicit role grant, so an unauthenticated caller
-- could still reach the function:
--
--   POST /rest/v1/rpc/is_first_order_delivery_free {"p_buyer_id": "<uuid>"}
--   -> false
--
-- With the promotion switched off it returns false early and leaks nothing,
-- but once an admin activates it the function becomes a public oracle telling
-- anyone whether an arbitrary user id has ever paid for an order.
--
-- calculate-order-fees calls this with the service role key, so no client role
-- needs EXECUTE at all.

REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.is_first_order_delivery_free(uuid, uuid) TO service_role;
