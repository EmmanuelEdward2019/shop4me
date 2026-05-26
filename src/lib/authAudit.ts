// Client-side wrappers around the auth-event audit / lockout RPCs
// (Slice B of the security plan). Every helper here is fail-safe:
// any unexpected error is swallowed and the auth flow continues
// unimpeded. The lockout check is fail-OPEN — a broken RPC can
// never block a real user from signing in.

import { supabase } from "@/integrations/supabase/client";

export type AuthEventType =
  | "signin_success"
  | "signin_failed"
  | "signup_attempt"
  | "signup_success"
  | "password_reset_requested"
  | "signout"
  | "suspended_kicked";

interface RecordAuthEventInput {
  eventType: AuthEventType;
  email?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Fire-and-forget audit event. Never throws. Returns immediately
 * (the underlying RPC call is awaited but its result is discarded
 * if the caller doesn't need it).
 *
 * Note: IP and user-agent are not populated here. The browser
 * can't see its own egress IP. Slice C will add IP capture from
 * the edge-function side for events that route through functions.
 */
export async function recordAuthEvent(input: RecordAuthEventInput): Promise<void> {
  try {
    await supabase.rpc("record_auth_event" as never, {
      p_event_type: input.eventType,
      p_email: input.email ?? null,
      p_user_id: input.userId ?? null,
      p_ip: null,
      p_user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      p_metadata: (input.metadata ?? null) as never,
    } as never);
  } catch (e) {
    // Observational logging must never break the caller.
    console.warn("recordAuthEvent failed:", e);
  }
}

export interface LoginLockoutResult {
  /** True when the email has hit the failure threshold within the window. */
  locked: boolean;
  /** Number of failed sign-ins for this email inside the lookback window. */
  attempts: number;
  /** ISO timestamp the user may retry at, or null if not locked. */
  retryAt: string | null;
  /** Seconds until retry is allowed, or null if not locked. */
  retryInSeconds: number | null;
  /** Server-configured threshold (currently 5). */
  threshold: number;
  /** Server-configured window in minutes (currently 5). */
  windowMinutes: number;
}

const NOT_LOCKED: LoginLockoutResult = {
  locked: false,
  attempts: 0,
  retryAt: null,
  retryInSeconds: null,
  threshold: 5,
  windowMinutes: 5,
};

/**
 * Ask the server whether this email is currently locked out from
 * signing in due to too many recent failures. Strictly fail-OPEN —
 * any error returns `locked: false` so a broken RPC cannot deny
 * a real user.
 */
export async function checkLoginLockout(email: string): Promise<LoginLockoutResult> {
  try {
    const { data, error } = await supabase.rpc("check_login_lockout" as never, {
      p_email: email,
    } as never);
    if (error) {
      console.warn("checkLoginLockout error (fail-open):", error.message);
      return NOT_LOCKED;
    }
    if (!data || typeof data !== "object") return NOT_LOCKED;
    const d = data as Record<string, unknown>;
    return {
      locked: Boolean(d.locked),
      attempts: Number(d.attempts ?? 0),
      retryAt: (d.retry_at as string | null) ?? null,
      retryInSeconds:
        d.retry_in_seconds == null ? null : Number(d.retry_in_seconds),
      threshold: Number(d.threshold ?? NOT_LOCKED.threshold),
      windowMinutes: Number(d.window_minutes ?? NOT_LOCKED.windowMinutes),
    };
  } catch (e) {
    console.warn("checkLoginLockout threw (fail-open):", e);
    return NOT_LOCKED;
  }
}

/**
 * Human-friendly lockout copy for toasts.
 */
export function formatLockoutMessage(result: LoginLockoutResult): string {
  const secs = result.retryInSeconds ?? 0;
  if (secs >= 60) {
    const mins = Math.ceil(secs / 60);
    return `Too many failed sign-in attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  return `Too many failed sign-in attempts. Try again in ${Math.max(1, secs)} seconds.`;
}
