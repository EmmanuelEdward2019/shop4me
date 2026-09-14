-- Why devices failed during a push campaign, e.g.
--   {"web_key_mismatch": 2, "expo_DeviceNotRegistered": 1, "removed": 3}
-- so the admin history can say "2 old browser subscriptions removed" instead of
-- an unexplained "2 failed".
ALTER TABLE public.push_campaigns
  ADD COLUMN IF NOT EXISTS error_summary jsonb;
