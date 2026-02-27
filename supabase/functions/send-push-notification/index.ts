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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { userId, role, title, body, url, data } = payload;

    let userIds: string[] = [];

    if (role) {
      console.log(`Broadcasting push notification to all ${role}s`);
      const { data: roleUsers, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role);

      if (roleError) {
        console.error("Error fetching role users:", roleError);
        throw roleError;
      }
      userIds = (roleUsers || []).map((r) => r.user_id);
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

    // ── 1. Web Push (existing) ──
    const { data: webSubs, error: webSubError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (webSubError) {
      console.error("Error fetching web subscriptions:", webSubError);
    }

    const webResults = await Promise.allSettled(
      (webSubs || []).map(async (sub) => {
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

    // ── 2. Expo Push (new for React Native) ──
    const { data: expoTokens, error: expoError } = await supabase
      .from("expo_push_tokens")
      .select("*")
      .in("user_id", userIds);

    if (expoError) {
      console.error("Error fetching Expo tokens:", expoError);
    }

    let expoResults: PromiseSettledResult<any>[] = [];

    if (expoTokens && expoTokens.length > 0) {
      // Batch Expo notifications (max 100 per request)
      const expoMessages = expoTokens.map((t) => ({
        to: t.token,
        sound: "default",
        title,
        body,
        data: { url, ...data },
      }));

      const chunks: typeof expoMessages[] = [];
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

          // Clean up invalid tokens
          if (result.data) {
            for (let i = 0; i < result.data.length; i++) {
              if (result.data[i].status === "error" &&
                  result.data[i].details?.error === "DeviceNotRegistered") {
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
    console.log(`Push sent: ${webSubs?.length || 0} web, ${expoTokens?.length || 0} expo tokens`);

    return new Response(
      JSON.stringify({ success: true, results: allResults }),
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
