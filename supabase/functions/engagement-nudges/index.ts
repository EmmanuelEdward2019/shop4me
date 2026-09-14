import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPush } from "../_shared/push.ts";

// Automated engagement nudges, triggered daily by pg_cron (see migration).
//   POST {}                         → run (at most once per hour, enforced in DB)
//   POST {action:"test", kind} + admin JWT → send that nudge to the admin only

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
type Sb = any;

const DEEP_LINKS: Record<string, { web: string; app: string }> = {
  home: { web: "/dashboard", app: "shop4me://screen/home" },
  new_order: { web: "/dashboard/new-order", app: "shop4me://screen/new_order" },
  wallet: { web: "/dashboard/wallet", app: "shop4me://screen/wallet" },
  orders: { web: "/dashboard/orders", app: "shop4me://screen/orders" },
  referrals: { web: "/dashboard", app: "shop4me://screen/referrals" },
  notifications: { web: "/dashboard", app: "shop4me://screen/notifications" },
};

async function requireAdmin(req: Request, supabase: Sb) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (!user) return null;
  const { data: row } = await supabase.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return row ? user : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* cron sends an empty/simple body */ }

  if (body?.action === "test") {
    const admin = await requireAdmin(req, supabase);
    if (!admin) return json({ error: "Only admins can send test nudges" }, 403);
    const { data: s } = await supabase.from("engagement_nudge_settings")
      .select("*").eq("kind", String(body.kind ?? "")).maybeSingle();
    if (!s) return json({ error: "Unknown nudge" }, 400);
    const link = DEEP_LINKS[s.deep_link] ?? DEEP_LINKS.home;
    const r = await sendPush(supabase, [admin.id], {
      title: s.title, body: s.body, webUrl: link.web, appUrl: link.app, data: { type: "engagement_test", nudge: s.kind },
    });
    return json({ ok: true, ...r });
  }

  const { data: claimed, error: claimErr } = await supabase.rpc("claim_engagement_run", { p_min_interval_minutes: 60 });
  if (claimErr) return json({ error: claimErr.message }, 500);
  if (!claimed) return json({ ok: true, skipped: true, reason: "Already ran within the last hour" });

  const { data: settings } = await supabase.from("engagement_nudge_settings").select("*").eq("enabled", true);
  const summary: Record<string, unknown>[] = [];

  for (const s of settings ?? []) {
    const { data: cands, error } = await supabase.rpc("get_nudge_candidates", { p_kind: s.kind, p_limit: 1000 });
    if (error) {
      summary.push({ kind: s.kind, error: error.message });
      continue;
    }
    const ids: string[] = (cands ?? []).map((c: { user_id: string }) => c.user_id);
    if (!ids.length) {
      summary.push({ kind: s.kind, targeted: 0 });
      continue;
    }
    const link = DEEP_LINKS[s.deep_link] ?? DEEP_LINKS.home;
    const r = await sendPush(supabase, ids, {
      title: s.title, body: s.body, webUrl: link.web, appUrl: link.app,
      data: { type: "engagement_nudge", nudge: s.kind },
    });

    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await supabase.from("engagement_nudge_log").insert(chunk.map((user_id) => ({ user_id, kind: s.kind })));
      const { error: nErr } = await supabase.from("notifications").insert(chunk.map((user_id) => ({
        user_id, type: "engagement", title: s.title, body: s.body, link: link.web, data: { nudge: s.kind },
      })));
      if (nErr) console.error("in-app nudge insert failed:", nErr);
    }
    await supabase.from("push_campaigns").insert({
      source: "nudge", nudge_kind: s.kind, title: s.title, body: s.body, audience: "segment",
      deep_link: s.deep_link, target_users: ids.length, web_sent: r.webSent, expo_sent: r.expoSent, failed: r.failed,
      error_summary: { ...r.reasons, removed: r.removed },
    });
    summary.push({ kind: s.kind, targeted: ids.length, ...r });
  }

  return json({ ok: true, summary });
});
