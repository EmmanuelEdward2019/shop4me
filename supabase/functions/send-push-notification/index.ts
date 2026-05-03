import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // ── Detect Database Webhook shape ──
    if (rawBody.type === "INSERT" && rawBody.table === "orders" && rawBody.record) {
      const webhook = rawBody as WebhookPayload;
      const order = webhook.record;

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
          pushData
        );
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
        return new Response(
          JSON.stringify({ success: true, message: "No matching agents" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = await sendPushToUsers(
        supabase, agentUserIds,
        "🛒 New Order Available!",
        `New order from ${locationName}. Accept it now!`,
        undefined, pushData
      );

      console.log(`Webhook push: store="${locationName}", zone="${serviceZone}", agents=${agentUserIds.length}`);
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Legacy client invoke shape ──
    const payload: PushPayload = rawBody;
    const { userId, role, title, body, url, data } = payload;

    let userIds: string[] = [];

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

    const results = await sendPushToUsers(supabase, userIds, title, body, url, data);

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
  data?: Record<string, string>
) {
  // ── 1. Web Push ──
  const { data: webSubs, error: webSubError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (webSubError) {
    console.error("Error fetching web subscriptions:", webSubError);
  }

  const webResults = await Promise.allSettled(
    (webSubs || []).map(async (sub: { endpoint: string; id: string }) => {
      try {
        const pushPayload = JSON.stringify({ title, body, url });
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400",
          },
          body: pushPayload,
        });

        if (!response.ok && response.status === 410) {
          console.log("Removing expired web subscription:", sub.endpoint);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }

        return { success: response.ok, type: "web", endpoint: sub.endpoint };
      } catch (error) {
        console.error("Error sending web push:", sub.endpoint, error);
        return { success: false, type: "web", endpoint: sub.endpoint, error };
      }
    })
  );

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
    const expoMessages = expoTokens.map((t: { token: string }) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: { url, ...data },
      channelId: "orders",
    }));

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
