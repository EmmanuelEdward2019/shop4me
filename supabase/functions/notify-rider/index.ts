import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This function runs with the service-role key so it bypasses Row Level Security.
// The agent's JWT cannot read another user's profile (RLS blocks it), which caused
// buyer_name / buyer_phone / delivery_address to be NULL in rider_alerts.
// By doing the insert here with service role, we always have full access to profiles.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // ── MODE: enrich — patch existing alerts that have null buyer details ──────
    // Called by the rider's dashboard to backfill buyer info on legacy alerts.
    if (body.action === "enrich") {
      const { alertIds } = body as { alertIds: string[] };
      if (!alertIds || alertIds.length === 0) {
        return new Response(JSON.stringify({ success: true, enriched: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: alerts } = await supabase
        .from("rider_alerts")
        .select("id, order_id, buyer_name, buyer_phone, delivery_address")
        .in("id", alertIds);

      let enriched = 0;
      for (const alert of (alerts || [])) {
        if (alert.buyer_name && alert.buyer_phone && alert.delivery_address) continue;

        const { data: order } = await supabase
          .from("orders")
          .select(`user_id, delivery_addresses(address_line1, address_line2, city, state, landmark)`)
          .eq("id", alert.order_id)
          .single();

        if (!order) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", order.user_id)
          .single();

        const da = order.delivery_addresses as any;
        const deliveryAddress = da
          ? [da.address_line1, da.address_line2, da.city, da.state, da.landmark ? `(Near: ${da.landmark})` : ""]
              .filter(Boolean)
              .join(", ")
          : null;

        await supabase
          .from("rider_alerts")
          .update({
            buyer_name: profile?.full_name || alert.buyer_name,
            buyer_phone: profile?.phone || alert.buyer_phone,
            delivery_address: deliveryAddress || alert.delivery_address,
          })
          .eq("id", alert.id);

        enriched++;
      }

      return new Response(JSON.stringify({ success: true, enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODE: create — create a new rider_alert for an order ─────────────────
    const { orderId, storeLatitude, storeLongitude } = body;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the requesting user is the assigned agent for this order
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentId = user.id;

    // ── 1. Fetch order with delivery address (service role — no RLS) ───────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, user_id, location_name, delivery_address_id, agent_id,
        delivery_addresses(address_line1, address_line2, city, state, landmark, latitude, longitude)
      `)
      .eq("id", orderId)
      .eq("agent_id", agentId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch buyer profile (service role bypasses RLS) ─────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", order.user_id)
      .single();

    const buyerName = profile?.full_name || null;
    const buyerPhone = profile?.phone || null;

    // ── 3. Build delivery address string ───────────────────────────────────────
    const da = order.delivery_addresses as any;
    const deliveryAddress = da
      ? [da.address_line1, da.address_line2, da.city, da.state, da.landmark ? `(Near: ${da.landmark})` : ""]
          .filter(Boolean)
          .join(", ")
      : "";

    const deliveryLat: number | null = da?.latitude ?? null;
    const deliveryLng: number | null = da?.longitude ?? null;

    // ── 4. Check for existing rider_alert (avoid duplicates) ──────────────────
    const { data: existing } = await supabase
      .from("rider_alerts")
      .select("id")
      .eq("order_id", orderId)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, message: "Rider alert already exists", id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 5. Insert rider_alert with full buyer details ──────────────────────────
    const { data: alert, error: insertError } = await supabase
      .from("rider_alerts")
      .insert({
        order_id: orderId,
        agent_id: agentId,
        store_location_name: order.location_name,
        status: "pending",
        store_latitude: storeLatitude ?? null,
        store_longitude: storeLongitude ?? null,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        delivery_address: deliveryAddress || null,
        delivery_latitude: deliveryLat,
        delivery_longitude: deliveryLng,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // ── 6. Send push notification to all riders ───────────────────────────────
    supabase.functions
      .invoke("send-push-notification", {
        body: {
          role: "rider",
          title: "New Pickup Available!",
          body: `A new order from ${order.location_name} needs pickup. Accept it now!`,
          url: "/rider/available-pickups",
        },
      })
      .catch((err: unknown) => console.error("Push notification error:", err));

    return new Response(
      JSON.stringify({ success: true, id: alert?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("notify-rider error:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
