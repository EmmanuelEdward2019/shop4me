import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

// Admin push campaigns. Actions (POST, admin JWT): count | test | send
// Delivers to web push + Expo (mobile) and mirrors into the in-app bell.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// deno-lint-ignore no-explicit-any
type Sb = any;

// Tap destinations. `app` is routed in-app by the mobile app (shop4me://screen/…);
// `web` is opened by the service worker for browser push.
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

async function roleUserIds(supabase: Sb, role: string): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", role).range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((r: { user_id: string }) => r.user_id));
    if (!data || data.length < 1000) break;
  }
  return ids;
}

async function allUserIds(supabase: Sb): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("profiles").select("user_id")
      .order("created_at", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((r: { user_id: string }) => r.user_id));
    if (!data || data.length < 1000) break;
  }
  return ids;
}

async function resolveUsers(supabase: Sb, audience: unknown, role: unknown, userIds: unknown): Promise<string[]> {
  let ids: string[];
  if (audience === "individual") {
    ids = (Array.isArray(userIds) ? userIds : []).filter(isUuid).slice(0, 1000);
    if (!ids.length) throw new Error("Select at least one recipient");
  } else if (audience === "role") {
    if (typeof role !== "string" || !["buyer", "agent", "rider", "admin"].includes(role)) throw new Error("Choose a valid role");
    ids = await roleUserIds(supabase, role);
  } else if (audience === "all") {
    ids = await allUserIds(supabase);
  } else {
    throw new Error("Choose who should receive this notification");
  }
  ids = [...new Set(ids)];
  const suspended = new Set<string>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await supabase.from("profiles").select("user_id")
      .in("user_id", ids.slice(i, i + 500)).eq("is_suspended", true);
    (data ?? []).forEach((r: { user_id: string }) => suspended.add(r.user_id));
  }
  return ids.filter((id) => !suspended.has(id));
}

async function reachability(supabase: Sb, ids: string[]) {
  const users = new Set<string>();
  let web = 0;
  let expo = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const [{ data: subs }, { data: toks }] = await Promise.all([
      supabase.from("push_subscriptions").select("user_id").in("user_id", chunk),
      supabase.from("expo_push_tokens").select("user_id").in("user_id", chunk),
    ]);
    (subs ?? []).forEach((r: { user_id: string }) => { users.add(r.user_id); web++; });
    (toks ?? []).forEach((r: { user_id: string }) => { users.add(r.user_id); expo++; });
  }
  return { reachableUsers: users.size, webDevices: web, mobileDevices: expo };
}

async function sendPush(
  supabase: Sb, userIds: string[],
  msg: { title: string; body: string; webUrl: string; appUrl: string; data?: Record<string, string> },
) {
  let webSent = 0;
  let expoSent = 0;
  let failed = 0;
  const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY");
  const webEnabled = !!(vapidPub && vapidPriv);
  if (webEnabled) webpush.setVapidDetails("mailto:support@shop4meng.com", vapidPub!, vapidPriv!);

  for (let i = 0; i < userIds.length; i += 500) {
    const chunk = userIds.slice(i, i + 500);

    if (webEnabled) {
      const { data: subs } = await supabase.from("push_subscriptions")
        .select("id, endpoint, p256dh, auth").in("user_id", chunk);
      const results = await Promise.allSettled(
        (subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: msg.title, body: msg.body, url: msg.webUrl, ...(msg.data ?? {}) }),
            );
          } catch (err) {
            const code = (err as { statusCode?: number })?.statusCode;
            if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
            throw err;
          }
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled") webSent++;
        else failed++;
      }
    }

    const { data: tokens } = await supabase.from("expo_push_tokens").select("token").in("user_id", chunk);
    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token, sound: "default", title: msg.title, body: msg.body,
      channelId: "default", priority: "default",
      data: { url: msg.appUrl, ...(msg.data ?? {}) },
    }));
    for (let j = 0; j < messages.length; j += 100) {
      const batch = messages.slice(j, j + 100);
      try {
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        const out = await res.json();
        const tickets: { status?: string; details?: { error?: string } }[] = out?.data ?? [];
        for (let k = 0; k < batch.length; k++) {
          const t = tickets[k];
          if (t?.status === "ok") {
            expoSent++;
          } else {
            failed++;
            if (t?.details?.error === "DeviceNotRegistered") {
              await supabase.from("expo_push_tokens").delete().eq("token", batch[k].to);
            }
          }
        }
      } catch (e) {
        console.error("Expo push batch failed:", e);
        failed += batch.length;
      }
    }
  }
  return { webSent, expoSent, failed };
}

async function insertInApp(
  supabase: Sb, userIds: string[], title: string, body: string, link: string, type: string,
  data: Record<string, unknown>,
) {
  for (let i = 0; i < userIds.length; i += 500) {
    const rows = userIds.slice(i, i + 500).map((user_id) => ({ user_id, type, title, body, link, data }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) console.error("in-app notification insert failed:", error);
  }
}

function destination(p: Record<string, unknown>) {
  const custom = typeof p.customUrl === "string" ? p.customUrl.trim() : "";
  if (p.deepLink === "custom") {
    if (!/^https:\/\//i.test(custom)) throw new Error("Custom links must start with https://");
    return { key: "custom", web: custom, app: custom };
  }
  const key = typeof p.deepLink === "string" && DEEP_LINKS[p.deepLink] ? p.deepLink : "home";
  return { key, ...DEEP_LINKS[key] };
}

function validateMessage(p: Record<string, unknown>) {
  const title = typeof p.title === "string" ? p.title.trim() : "";
  const body = typeof p.body === "string" ? p.body.trim() : "";
  if (!title) throw new Error("Add a title");
  if (title.length > 65) throw new Error("Title is too long (max 65 characters)");
  if (!body) throw new Error("Add a message");
  if (body.length > 240) throw new Error("Message is too long (max 240 characters)");
  return { title, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const admin = await requireAdmin(req, supabase);
  if (!admin) return json({ error: "Only admins can send push notifications" }, 403);

  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  try {
    switch (p.action) {
      case "count": {
        const users = await resolveUsers(supabase, p.audience, p.role, p.userIds);
        return json({ targetUsers: users.length, ...(await reachability(supabase, users)) });
      }
      case "test": {
        const { title, body } = validateMessage(p);
        const dest = destination(p);
        const r = await sendPush(supabase, [admin.id], {
          title, body, webUrl: dest.web, appUrl: dest.app, data: { type: "announcement_test" },
        });
        return json({ ok: true, ...r });
      }
      case "send": {
        const { title, body } = validateMessage(p);
        const dest = destination(p);
        const users = await resolveUsers(supabase, p.audience, p.role, p.userIds);
        if (!users.length) throw new Error("No users match this audience");
        const r = await sendPush(supabase, users, {
          title, body, webUrl: dest.web, appUrl: dest.app, data: { type: "announcement" },
        });
        await insertInApp(supabase, users, title, body, dest.web, "announcement", { deep_link: dest.key });
        await supabase.from("push_campaigns").insert({
          source: "admin", title, body, audience: String(p.audience),
          audience_role: p.audience === "role" ? p.role : null, deep_link: dest.key,
          target_users: users.length, web_sent: r.webSent, expo_sent: r.expoSent, failed: r.failed,
          created_by: admin.id,
        });
        return json({ ok: true, targetUsers: users.length, ...r });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("admin-push-campaign error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
