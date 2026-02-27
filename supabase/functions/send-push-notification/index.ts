import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  userId?: string;
  role?: string; // broadcast to all users with this role
  title: string;
  body: string;
  url?: string;
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
    const { userId, role, title, body, url } = payload;

    let userIds: string[] = [];

    if (role) {
      // Broadcast to all users with this role
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

    // Get push subscriptions for all target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions for ${userIds.length} users`);

    // Send to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
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
            console.log("Removing expired subscription:", sub.endpoint);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }

          return { success: response.ok, endpoint: sub.endpoint };
        } catch (error) {
          console.error("Error sending to endpoint:", sub.endpoint, error);
          return { success: false, endpoint: sub.endpoint, error };
        }
      })
    );

    console.log("Push notification results:", results);

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
