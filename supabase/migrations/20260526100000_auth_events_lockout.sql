-- ────────────────────────────────────────────────────────────────────
-- Security Slice B — Auth events + per-email lockout
--
-- Captures sign-in, sign-up, password-reset, sign-out, and
-- suspended-kick events into a dedicated table. Exposes a lockout
-- RPC that the login form calls BEFORE attempting authentication —
-- 5 failed sign-in attempts on the same email within 5 minutes ⇒
-- locked for 15 minutes.
--
-- Strictly ADDITIVE: no existing table, policy, or RPC is touched.
-- The lockout pre-check is fail-OPEN on the client (a bug here
-- cannot block real users from signing in).
-- ────────────────────────────────────────────────────────────────────

-- Tunables (kept as inline constants for now; can move to
-- platform_settings later if you want runtime control).
--   LOCKOUT_WINDOW   : how far back to count failures
--   LOCKOUT_THRESHOLD: failures that trigger the lock
--   LOCKOUT_DURATION : how long the lock stays in effect after the
--                      Nth failure

CREATE TABLE IF NOT EXISTS public.auth_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT,                          -- captured even when user_id is null (failed attempts)
  event_type   TEXT         NOT NULL,         -- 'signin_success' | 'signin_failed' | 'signup_attempt' | 'signup_success' | 'password_reset_requested' | 'signout' | 'suspended_kicked'
  ip           TEXT,
  user_agent   TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_events_email_event_created_idx
  ON public.auth_events (lower(email), event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_events_ip_event_created_idx
  ON public.auth_events (ip, event_type, created_at DESC) WHERE ip IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_events_user_created_idx
  ON public.auth_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_events_created_idx
  ON public.auth_events (created_at DESC);

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Admin-only read. Writes go through the RPC below; no INSERT/
-- UPDATE/DELETE policy → no direct write path from client code.
DROP POLICY IF EXISTS "Admins can view auth events" ON public.auth_events;
CREATE POLICY "Admins can view auth events"
  ON public.auth_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── record_auth_event RPC ──────────────────────────────────────────
-- Observational logger. Anyone (including anon — sign-up / failed
-- login happens pre-auth) can call this. Always returns silently;
-- swallows errors so an auth flow can never be broken by a logging
-- bug.
CREATE OR REPLACE FUNCTION public.record_auth_event(
  p_event_type TEXT,
  p_email      TEXT  DEFAULT NULL,
  p_user_id    UUID  DEFAULT NULL,
  p_ip         TEXT  DEFAULT NULL,
  p_user_agent TEXT  DEFAULT NULL,
  p_metadata   JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RETURN;
  END IF;

  v_user := COALESCE(p_user_id, auth.uid());

  INSERT INTO public.auth_events (
    user_id, email, event_type, ip, user_agent, metadata
  ) VALUES (
    v_user,
    NULLIF(lower(trim(p_email)), ''),
    p_event_type,
    p_ip,
    p_user_agent,
    p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'record_auth_event failed: % %', SQLSTATE, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_auth_event(
  TEXT, TEXT, UUID, TEXT, TEXT, JSONB
) TO anon, authenticated, service_role;

-- ─── check_login_lockout RPC ────────────────────────────────────────
-- Returns JSON:
--   { locked: bool, attempts: int, retry_at: timestamptz | null,
--     retry_in_seconds: int | null, threshold: int, window_minutes: int }
--
-- Called by the login form BEFORE submitting credentials. Strictly
-- read-only — never mutates state, never errors out (returns
-- locked=false on any internal failure so genuine users are never
-- blocked by a bug here).
CREATE OR REPLACE FUNCTION public.check_login_lockout(
  p_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_minutes   INT := 5;      -- look back 5 minutes
  v_threshold        INT := 5;      -- ≥5 failures within the window ⇒ locked
  v_lockout_minutes  INT := 15;     -- block for 15 minutes from the Nth failure
  v_email            TEXT;
  v_attempts         INT;
  v_last_failure     TIMESTAMPTZ;
  v_retry_at         TIMESTAMPTZ;
  v_locked           BOOLEAN := false;
BEGIN
  v_email := NULLIF(lower(trim(p_email)), '');
  IF v_email IS NULL THEN
    RETURN json_build_object(
      'locked', false, 'attempts', 0, 'retry_at', NULL,
      'retry_in_seconds', NULL,
      'threshold', v_threshold, 'window_minutes', v_window_minutes
    );
  END IF;

  SELECT COUNT(*), MAX(created_at)
    INTO v_attempts, v_last_failure
    FROM public.auth_events
   WHERE email = v_email
     AND event_type = 'signin_failed'
     AND created_at >= now() - make_interval(mins => v_window_minutes);

  IF v_attempts >= v_threshold AND v_last_failure IS NOT NULL THEN
    v_retry_at := v_last_failure + make_interval(mins => v_lockout_minutes);
    IF v_retry_at > now() THEN
      v_locked := true;
    END IF;
  END IF;

  RETURN json_build_object(
    'locked', v_locked,
    'attempts', COALESCE(v_attempts, 0),
    'retry_at', CASE WHEN v_locked THEN v_retry_at ELSE NULL END,
    'retry_in_seconds', CASE
      WHEN v_locked THEN GREATEST(0, EXTRACT(EPOCH FROM (v_retry_at - now()))::int)
      ELSE NULL
    END,
    'threshold', v_threshold,
    'window_minutes', v_window_minutes
  );
EXCEPTION WHEN OTHERS THEN
  -- Fail-OPEN: never deny a login because the lockout check broke.
  RAISE WARNING 'check_login_lockout failed: % %', SQLSTATE, SQLERRM;
  RETURN json_build_object(
    'locked', false, 'attempts', 0, 'retry_at', NULL,
    'retry_in_seconds', NULL,
    'threshold', 5, 'window_minutes', 5
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_login_lockout(TEXT)
  TO anon, authenticated, service_role;
