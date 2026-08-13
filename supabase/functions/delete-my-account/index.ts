import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Inlined audit helper (see _shared/audit.ts) ──────────────────
function getRequestIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

interface AuditPayload {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function recordAudit(
  supabase: any,
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
      p_user_agent: req ? req.headers.get("user-agent") : null,
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
// ─── End inlined audit helper ─────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Self-service account deletion for ANY signed-in user (buyer, agent, rider).
// The caller can only ever delete THEIR OWN account — the id comes from their
// verified JWT, never from the request body. The auth.users delete cascades to
// their data per the FK rules set in the account-deletion-cascade-safe
// migration (personal rows removed, orders anonymized).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Identify the caller from their JWT — self-delete only.
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Snapshot identity for the audit trail before the row disappears.
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", caller.id)
      .maybeSingle();

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);

    // Hard-delete the auth user — cascades to their data per FK rules.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(caller.id);
    if (deleteError) {
      await recordAudit(supabase, req, {
        action: "account.self_delete_failed",
        actorId: caller.id,
        actorRole: roles[0] ?? "buyer",
        targetType: "user",
        targetId: caller.id,
        metadata: { error: deleteError.message, email: profile?.email ?? caller.email ?? null },
      });
      console.error("delete-my-account: auth delete failed:", deleteError);
      return new Response(
        JSON.stringify({ error: "We couldn't delete your account. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await recordAudit(supabase, req, {
      action: "account.self_deleted",
      actorId: caller.id,
      actorRole: roles[0] ?? "buyer",
      targetType: "user",
      targetId: caller.id,
      metadata: {
        email: profile?.email ?? caller.email ?? null,
        name: profile?.full_name ?? null,
        roles,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("delete-my-account error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
