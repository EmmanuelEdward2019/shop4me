import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  userId?: string;
  role?: string;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: Record<string, unknown>;
  schema: string;
  old_record?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json();

    // ── Caller authentication (security hardening) ───────────────────────────
    // This function sends with the service role, so it must not be an open relay.
    //   • Server callers (paystack, pay-with-wallet, notify-rider) present the
    //     service-role key → trusted, unchanged behaviour.
    //   • App users present their session JWT → scoped further below.
    //   • Anonymous callers may only use the order-INSERT shape, which is
    //     re-verified against the database and announced once.
    const authToken = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    let trustedCaller = false;
    let callerUid: string | null = null;
    let callerIsAdmin = false;
    if (authToken && authToken === supabaseServiceKey) {
      trustedCaller = true;
    } else if (authToken) {
      try {
        const verifier = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: claimsData } = await verifier.auth.getClaims(authToken);
        const claims = claimsData?.claims as Record<string, unknown> | undefined;
        if (claims?.role === "service_role") {
          trustedCaller = true;
        } else if (claims?.role === "authenticated" && typeof claims.sub === "string") {
          callerUid = claims.sub;
          const { data: adminRow } = await supabase.from("user_roles").select("role")
            .eq("user_id", callerUid).eq("role", "admin").maybeSingle();
          callerIsAdmin = !!adminRow;
        }
      } catch (e) {
        console.warn("push auth: token verification failed", e);
      }
    }
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
    const deny = (status: number, error: string) =>
      new Response(JSON.stringify({ success: false, error }), { status, headers: jsonHeaders });

    // ── Detect Database Webhook shape ──
    if (rawBody.type === "INSERT" && rawBody.table === "orders" && rawBody.record) {
      const webhook = rawBody as WebhookPayload;
      // Never trust the posted record: re-read the order, so a caller can't
      // fabricate one or change its store/zone/agent to spam other agents.
      const claimedId = String((webhook.record as Record<string, unknown>)?.id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(claimedId)) return deny(400, "Invalid order id");
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", claimedId)
        .maybeSingle();
      if (!dbOrder) return deny(404, "Order not found");
      if (!trustedCaller && Date.now() - new Date(String(dbOrder.created_at)).getTime() > 15 * 60 * 1000) {
        return deny(403, "Only newly created orders can be announced");
      }
      // Announce each order once — the DB webhook and the web client may both fire.
      const { error: dedupeErr } = await supabase.from("push_dedupe").insert({ key: `new_order:${claimedId}` });
      if (dedupeErr) {
        if (dedupeErr.code === "23505") {
          return new Response(JSON.stringify({ success: true, message: "Order already announced" }), { headers: jsonHeaders });
        }
        console.error("push_dedupe insert failed (continuing):", dedupeErr);
      }
      const order = dbOrder as Record<string, unknown>;

      if (order.status !== "pending") {
        return new Response(
          JSON.stringify({ success: true, message: "Not a new pending order, skipping" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const serviceZone = order.service_zone ? String(order.service_zone).trim().toLowerCase() : null;
      const locationName = String(order.location_name || "a store");
      const orderId = String(order.id);
      const pushData = { orderId, service_zone: serviceZone || "" };

      // ── Pre-assigned to a specific agent (single dedicated store agent) ──────
      // Notify that agent directly — do NOT skip just because agent_id is set.
      if (order.agent_id) {
        const results = await sendPushToUsers(
          supabase,
          [String(order.agent_id)],
          "🛒 New Order Assigned to You!",
          `A new order from ${locationName} is waiting for you.`,
          undefined,
          { ...pushData, type: "order_assigned" }
        );
        await emailNewOrder(supabase, order, [String(order.agent_id)]);
        console.log(`Webhook push (pre-assigned): agent=${order.agent_id}, store="${locationName}"`);
        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── No pre-assignment — look up store agents then fall back to zone ──────
      let agentUserIds: string[] = [];

      const { data: storeRow } = await supabase
        .from("stores")
        .select("id")
        .ilike("name", locationName)
        .limit(1)
        .maybeSingle();

      if (storeRow?.id) {
        const { data: storeAgents } = await supabase
          .from("store_agents")
          .select("agent_id")
          .eq("store_id", storeRow.id);
        if (storeAgents && storeAgents.length > 0) {
          agentUserIds = storeAgents.map((sa: { agent_id: string }) => sa.agent_id);
          console.log(`${agentUserIds.length} dedicated agent(s) for store "${locationName}"`);
        }
      }

      if (agentUserIds.length === 0) {
        agentUserIds = await getZonedAgentIds(supabase, serviceZone);
      }

      if (agentUserIds.length === 0) {
        console.log(`No agents found for store "${locationName}" / zone "${serviceZone}"`);
        await emailNewOrder(supabase, order, []);
        return new Response(
          JSON.stringify({ success: true, message: "No matching agents" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = await sendPushToUsers(
        supabase, agentUserIds,
        "🛒 New Order Available!",
        `New order from ${locationName}. Accept it now!`,
        undefined, { ...pushData, type: "new_order" }
      );

      await emailNewOrder(supabase, order, agentUserIds);

      console.log(`Webhook push: store="${locationName}", zone="${serviceZone}", agents=${agentUserIds.length}`);
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Legacy client invoke shape ──
    const payload: PushPayload = rawBody;
    let { userId, role, title, body, url, data } = payload;
    let priority: "default" | "high" =
      (rawBody as any)?.priority === "high" ? "high" : "default";
    let explicitUserIds: string[] | undefined = (rawBody as any).userIds;

    // ── Scope what a signed-in, non-admin app user may send ──────────────────
    if (!trustedCaller && !callerIsAdmin) {
      if (!callerUid) return deny(401, "Unauthorized");
      const scopedOrderId =
        typeof data?.orderId === "string" && /^[0-9a-f-]{36}$/i.test(data.orderId) ? data.orderId : null;

      if (role) {
        // The only legitimate user broadcast is "order packed" → riders, and only
        // for an order this agent is actually handling, once per order.
        if (role !== "rider" || !scopedOrderId) return deny(403, "Broadcasts are not permitted");
        const [{ data: owned }, { data: alerts }] = await Promise.all([
          supabase.from("orders").select("id").eq("id", scopedOrderId).eq("agent_id", callerUid).maybeSingle(),
          supabase.from("rider_alerts").select("id").eq("order_id", scopedOrderId).eq("agent_id", callerUid).limit(1),
        ]);
        if (!owned && !(alerts && alerts.length)) return deny(403, "Not your order");
        const { error: dupErr } = await supabase.from("push_dedupe").insert({ key: `rider_broadcast:${scopedOrderId}` });
        if (dupErr && dupErr.code === "23505") {
          return new Response(JSON.stringify({ success: true, message: "Riders already notified for this order" }), { headers: jsonHeaders });
        }
      } else {
        const requested = [...new Set([...(explicitUserIds ?? []), ...(userId ? [userId] : [])])]
          .filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))
          .slice(0, 10);
        if (requested.length === 0) return deny(400, "userId or userIds required");
        const { data: permitted, error: permErr } = await supabase.rpc("push_permitted_targets", {
          p_caller: callerUid, p_targets: requested, p_order_id: scopedOrderId,
        });
        if (permErr) {
          console.error("push_permitted_targets failed:", permErr);
          return deny(500, "Could not verify recipients");
        }
        const allowed = (permitted as string[] | null) ?? [];
        if (allowed.length === 0) return deny(403, "You can only notify people on your own orders or chats");
        explicitUserIds = allowed;
        userId = undefined;
      }
      // Delivery priority/sound is decided per alert kind in sendPushToUsers.
    }

    let userIds: string[] = [];

    // Direct userIds array — highest priority (used by paystack-webhook etc.)
    if (explicitUserIds && explicitUserIds.length > 0) {
      const results = await sendPushToUsers(supabase, explicitUserIds, title, body, url, data, priority);
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role === "agent" && data?.service_zone) {
      const serviceZone = data.service_zone.trim().toLowerCase();
      userIds = await getZonedAgentIds(supabase, serviceZone);
    } else if (role) {
      console.log(`Broadcasting push notification to all ${role}s`);
      const { data: roleUsers, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role);

      if (roleError) {
        console.error("Error fetching role users:", roleError);
        throw roleError;
      }
      userIds = (roleUsers || []).map((r: { user_id: string }) => r.user_id);
    } else if (userId) {
      userIds = [userId];
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "userId or role required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userIds.length === 0) {
      console.log("No users found for notification target");
      return new Response(
        JSON.stringify({ success: true, message: "No users found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await sendPushToUsers(supabase, userIds, title, body, url, data, priority);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getZonedAgentIds(
  supabase: ReturnType<typeof createClient>,
  serviceZone: string | null
): Promise<string[]> {
  const { data: agentRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "agent");

  if (rolesError || !agentRoles || agentRoles.length === 0) {
    console.error("Error or no agents found:", rolesError);
    return [];
  }

  const agentIds = agentRoles.map((r: { user_id: string }) => r.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, service_zone")
    .in("user_id", agentIds);

  if (profilesError || !profiles) {
    console.error("Error fetching agent profiles:", profilesError);
    return [];
  }

  if (serviceZone) {
    return profiles
      .filter((p: { service_zone: string | null }) =>
        p.service_zone && p.service_zone.trim().toLowerCase() === serviceZone
      )
      .map((p: { user_id: string }) => p.user_id);
  } else {
    return profiles
      .filter((p: { service_zone: string | null }) => !p.service_zone)
      .map((p: { user_id: string }) => p.user_id);
  }
}

async function sendPushToUsers(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  title: string,
  body: string,
  url?: string,
  data?: Record<string, string>,
  priority?: "default" | "high",
) {
  // ── 1. Web Push ──
  const { data: webSubs, error: webSubError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (webSubError) {
    console.error("Error fetching web subscriptions:", webSubError);
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  let webResults: PromiseSettledResult<unknown>[] = [];

  if (webSubs && webSubs.length > 0) {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured — skipping web push");
    } else {
      webpush.setVapidDetails(
        "mailto:support@shop4meng.com",
        vapidPublicKey,
        vapidPrivateKey,
      );

      webResults = await Promise.allSettled(
        webSubs.map(async (sub: { endpoint: string; p256dh: string; auth: string; id: string }) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ title, body, url, ...data }),
            );
            return { success: true, type: "web", endpoint: sub.endpoint };
          } catch (err: any) {
            console.error("Web push error:", sub.endpoint, err.statusCode, err.body);
            if (err.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
            return { success: false, type: "web", endpoint: sub.endpoint, error: err.message };
          }
        })
      );
    }
  }

  // ── 2. Expo Push ──
  const { data: expoTokens, error: expoError } = await supabase
    .from("expo_push_tokens")
    .select("*")
    .in("user_id", userIds);

  if (expoError) {
    console.error("Error fetching Expo tokens:", expoError);
  }

  let expoResults: PromiseSettledResult<unknown>[] = [];

  if (expoTokens && expoTokens.length > 0) {
    // Orders, rider requests and nudges RING; chat messages get a loud message
    // alert. `sound_version >= 2` marks app builds that bundle the custom sounds
    // and the v2 Android channels (a channel's sound can't change once created,
    // so older installs keep the original channel IDs).
    const kind = alertKind(url, data);
    void priority; // every event push is sent high priority now
    const expoMessages = expoTokens.map((t: { token: string; sound_version?: number | null }) => {
      const ringReady = (t.sound_version ?? 1) >= 2;
      const isRing = kind === "ring";
      const isMessage = kind === "message";
      return {
        to: t.token,
        title,
        body,
        data: { url, ...data },
        sound: ringReady && isRing ? "order_ring.wav" : ringReady && isMessage ? "message_ring.wav" : "default",
        channelId: ringReady && isRing ? "orders_ring_v2" : ringReady && isMessage ? "chat_ring_v2" : "orders",
        // 'high' = delivered immediately (APNs priority 10 / FCM high) instead of
        // being held back by iOS power management or Android Doze.
        priority: "high",
        // Breaks through iOS Focus modes (needs the time-sensitive entitlement).
        ...(isRing || isMessage ? { interruptionLevel: "time-sensitive" } : {}),
      };
    });

    const chunks: (typeof expoMessages)[] = [];
    for (let i = 0; i < expoMessages.length; i += 100) {
      chunks.push(expoMessages.slice(i, i + 100));
    }

    expoResults = await Promise.allSettled(
      chunks.map(async (chunk) => {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();

        if (result.data) {
          for (let i = 0; i < result.data.length; i++) {
            if (result.data[i].status === "error") {
              console.error("Expo push ticket error:", result.data[i].details?.error, result.data[i].message);
            }
            if (
              result.data[i].status === "error" &&
              result.data[i].details?.error === "DeviceNotRegistered"
            ) {
              console.log("Removing invalid Expo token:", chunk[i].to);
              await supabase
                .from("expo_push_tokens")
                .delete()
                .eq("token", chunk[i].to);
            }
          }
        }

        return { success: response.ok, type: "expo", count: chunk.length, result };
      })
    );
  }

  const allResults = { web: webResults, expo: expoResults };
  console.log(
    `Push sent: ${webSubs?.length || 0} web, ${expoTokens?.length || 0} expo tokens`
  );
  return allResults;
}

const RING_TYPES = new Set(["new_order", "order_assigned", "assigned_order", "rider_request", "order_packed", "nudge"]);

function alertKind(url?: string, data?: Record<string, string>): "ring" | "message" | "normal" {
  const type = data?.type;
  if (type && RING_TYPES.has(type)) return "ring";
  if (url && url.startsWith("/rider/available-pickups")) return "ring";
  if (type === "chat" || (data && "messageType" in data)) return "message";
  return "normal";
}

// Email the targeted agent(s) and every admin about a new order. Email is the
// fallback for agents without a registered phone, and lets admins chase orders
// nobody picks up — including stores that have no agent at all.
// deno-lint-ignore no-explicit-any
async function emailNewOrder(supabase: any, order: Record<string, unknown>, agentIds: string[]) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey };
  const orderId = String(order.id);
  const locationName = String(order.location_name || "a store");
  const jobs: Promise<unknown>[] = [];
  const send = (type: string, data: Record<string, unknown>) =>
    jobs.push(
      fetch(`${supabaseUrl}/functions/v1/send-notification-email`, { method: "POST", headers, body: JSON.stringify({ type, data }) })
        .catch((e) => console.error(`${type} email failed:`, e)),
    );
  try {
    const { data: buyer } = await supabase.from("profiles").select("full_name")
      .eq("user_id", String(order.user_id || "")).maybeSingle();
    const buyerName = buyer?.full_name || undefined;

    const { data: agents } = agentIds.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", agentIds)
      : { data: [] as { user_id: string; full_name: string | null; email: string | null }[] };
    for (const a of agents ?? []) {
      if (a.email) {
        send("new_order_agent", {
          email: a.email, name: a.full_name, orderId, locationName, buyerName, estimatedTotal: order.estimated_total,
        });
      }
    }

    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);
    if (adminIds.length) {
      const { data: admins } = await supabase.from("profiles").select("email").in("user_id", adminIds);
      const agentName = agentIds.length === 0
        ? "No agent covers this store — please assign one"
        : agentIds.length === 1 ? (agents?.[0]?.full_name ?? undefined) : undefined;
      for (const ad of admins ?? []) {
        if (ad.email) {
          send("new_order_admin", {
            email: ad.email, orderId, locationName, buyerName, agentName, estimatedTotal: order.estimated_total,
          });
        }
      }
    }
    await Promise.allSettled(jobs);
  } catch (e) {
    console.error("new order emails failed:", e);
  }
}
