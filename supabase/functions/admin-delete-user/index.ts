import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Inlined audit helper (see _shared/audit.ts) ──────────────────
// `supabase functions deploy` doesn't bundle `_shared/`, so the
// helper is duplicated here. Keep in sync with `_shared/audit.ts`.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller identity
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Must be admin
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Snapshot the target's identity BEFORE deletion so the audit row
    // still has something useful to attribute.
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Hard-delete the auth user (cascades to profiles via DB trigger)
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      await recordAudit(supabase, req, {
        action: "admin.user_delete_failed",
        actorId: caller.id,
        actorRole: "admin",
        targetType: "user",
        targetId: userId,
        metadata: { error: error.message, target_email: targetProfile?.email },
      });
      throw error;
    }

    await recordAudit(supabase, req, {
      action: "admin.user_deleted",
      actorId: caller.id,
      actorRole: "admin",
      targetType: "user",
      targetId: userId,
      metadata: {
        target_email: targetProfile?.email ?? null,
        target_name: targetProfile?.full_name ?? null,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-delete-user error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
