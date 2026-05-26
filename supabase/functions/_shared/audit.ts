// DO NOT IMPORT FROM EDGE FUNCTIONS.
//
// `supabase functions deploy <name>` does NOT bundle the
// `supabase/functions/_shared/` directory alongside the function it
// deploys, so any function importing `../_shared/audit.ts` will fail
// at deploy time with:
//   "Failed to bundle the function (reason: Module not found …)"
//
// The same caveat already led the project to inline the email
// templates into `send-notification-email/index.ts`. We follow that
// pattern for the audit helpers too — each function that needs
// `recordAudit` inlines a local copy. This file is kept only as the
// canonical reference for the inlined helper; if you change the
// helper here, propagate the change into each function file's
// "Inlined audit helper" block.
//
// Edge functions that currently contain an inlined copy:
//   - pay-with-wallet/index.ts
//   - paystack-initialize/index.ts
//   - paystack-wallet-topup/index.ts
//   - paystack-verify/index.ts
//   - paystack-webhook/index.ts
//   - admin-delete-user/index.ts
//   - notify-rider/index.ts

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuditPayload {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function getRequestIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent");
}

export async function recordAudit(
  supabase: SupabaseClient,
  req: Request | null,
  payload: AuditPayload,
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("record_audit", {
      p_action: payload.action,
      p_actor_id: payload.actorId ?? null,
      p_actor_role: payload.actorRole ?? null,
      p_target_type: payload.targetType ?? null,
      p_target_id: payload.targetId ?? null,
      p_ip: req ? getRequestIp(req) : null,
      p_user_agent: req ? getUserAgent(req) : null,
      p_metadata: payload.metadata ?? null,
    });
    if (error) {
      console.error(`[audit] record_audit failed for action=${payload.action}:`, error);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.error(`[audit] unexpected failure for action=${payload.action}:`, e);
    return null;
  }
}
