-- Fixed-window rate-limit store shared by the email edge functions (the mobile
-- `send-mobile-email` limiter for signup/password-reset, and any future
-- logged-out email flow). Service-role only: RLS is enabled with NO policies,
-- so only functions using the service-role key can read/write it. The limiter
-- is fail-open, so this table is non-blocking — but without it, rate limiting
-- on signup/password-reset never actually engages.
--
-- Idempotent: safe to re-run.
create table if not exists public.email_rate_limits (
  key          text        primary key,
  window_start timestamptz not null default now(),
  count        int         not null default 0
);

alter table public.email_rate_limits enable row level security;
