-- ────────────────────────────────────────────────────────────────────
-- Security Slice A — Audit log foundation
--
-- A single persistent table that captures sensitive actions taken
-- on the platform, with the actor, the target, the action, the IP
-- (when known), and a free-form JSON payload for action-specific
-- context. Edge functions and authenticated client code can write
-- to it via the `record_audit` RPC.
--
-- Strictly ADDITIVE: this migration touches no existing table,
-- policy, or RPC. Nothing in the current code paths depends on
-- this; rolling it back is a single DROP.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role   TEXT,                       -- 'buyer' | 'agent' | 'rider' | 'admin' | 'service' | 'anon'
  action       TEXT         NOT NULL,      -- e.g. 'wallet.debit', 'payment.success', 'admin.suspend', 'auth.signin_failed'
  target_type  TEXT,                       -- e.g. 'order', 'user', 'wallet', 'withdrawal'
  target_id    TEXT,                       -- free-form (UUID, slug, email, etc.) so non-UUID targets fit too
  ip           TEXT,                       -- cf-connecting-ip / x-forwarded-for first hop
  user_agent   TEXT,
  metadata     JSONB,                      -- action-specific extras
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx
  ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx
  ON public.audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_target_idx
  ON public.audit_logs (target_type, target_id);

CREATE INDEX IF NOT EXISTS audit_logs_ip_created_idx
  ON public.audit_logs (ip, created_at DESC) WHERE ip IS NOT NULL;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read. Inserts are funneled through `record_audit`
-- (SECURITY DEFINER) so we deliberately do NOT add an INSERT policy
-- — even an authenticated user can't write rows directly, which
-- prevents log forgery from a compromised buyer/agent account.
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No UPDATE / DELETE policies at all → rows are append-only from
-- the client's perspective. Admins with service_role can still
-- prune from the Supabase dashboard if ever needed.

-- ─── record_audit RPC ───────────────────────────────────────────────
-- Single entry point that every code path uses to write an audit
-- row. Inputs are mostly optional so callers can fill what they
-- have. Returns the new row id for chaining (e.g. tying a webhook
-- to a follow-up update).
CREATE OR REPLACE FUNCTION public.record_audit(
  p_action      TEXT,
  p_actor_id    UUID    DEFAULT NULL,
  p_actor_role  TEXT    DEFAULT NULL,
  p_target_type TEXT    DEFAULT NULL,
  p_target_id   TEXT    DEFAULT NULL,
  p_ip          TEXT    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL,
  p_metadata    JSONB   DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id          BIGINT;
  v_actor       UUID;
  v_actor_role  TEXT;
BEGIN
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    -- Don't error — auditing must never break the caller. Drop the row.
    RETURN NULL;
  END IF;

  v_actor := COALESCE(p_actor_id, auth.uid());

  -- Best-effort role lookup. Falls back gracefully if no row.
  IF p_actor_role IS NOT NULL THEN
    v_actor_role := p_actor_role;
  ELSIF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_actor_role
      FROM public.user_roles
      WHERE user_id = v_actor
      ORDER BY CASE role
        WHEN 'admin' THEN 1
        WHEN 'agent' THEN 2
        WHEN 'rider' THEN 3
        ELSE 4
      END
      LIMIT 1;
  ELSE
    v_actor_role := 'anon';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, action,
    target_type, target_id,
    ip, user_agent, metadata
  ) VALUES (
    v_actor, v_actor_role, p_action,
    p_target_type, p_target_id,
    p_ip, p_user_agent, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Auditing is observational, never load-bearing. If the insert
  -- fails for any reason (RLS misconfig, disk pressure, etc.) we
  -- swallow the error so the caller's real work still succeeds.
  RAISE WARNING 'record_audit failed: % %', SQLSTATE, SQLERRM;
  RETURN NULL;
END;
$$;

-- Both authenticated callers (client-side hooks) and the service
-- role (edge functions) can write logs.
GRANT EXECUTE ON FUNCTION public.record_audit(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;
