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

// This function runs with the service-role key so it bypasses Row Level Security.
// The agent's JWT cannot read another user's profile (RLS blocks it), which caused
// buyer_name / buyer_phone / delivery_address to be NULL in rider_alerts.
// By doing the insert here with service role, we always have full access to profiles.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Great-circle distance in km between two lat/lng points.
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    await recordAudit(supabase, req, {
      action: "delivery.rider_alert_created",
      actorId: agentId,
      actorRole: "agent",
      targetType: "order",
      targetId: orderId,
      metadata: {
        alert_id: alert?.id,
        store_location_name: order.location_name,
        has_delivery_coords: deliveryLat != null && deliveryLng != null,
      },
    });

    // ── 6–7. Notify riders: NEARBY-FIRST, broadcast fallback ─────────────────
    // Push/email only riders whose last-known location is within
    // RIDER_NEARBY_RADIUS_KM of the store (and reported within
    // RIDER_LOCATION_FRESHNESS_MIN minutes). If no nearby riders are known
    // (e.g. none online, none reporting location yet), fall back to notifying
    // ALL riders — exactly the previous behaviour. Note: any rider can still
    // SEE and accept a pending pickup regardless of these pushes, so no order
    // is ever hidden.
    const RADIUS_KM = Number(Deno.env.get("RIDER_NEARBY_RADIUS_KM") ?? "5") || 5;
    const FRESHNESS_MIN = Number(Deno.env.get("RIDER_LOCATION_FRESHNESS_MIN") ?? "20") || 20;

    const { data: riderRoleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "rider");
    const allRiderIds = new Set((riderRoleRows || []).map((r: { user_id: string }) => r.user_id));

    // Store coordinates come from the request (the agent's store location).
    const sLat = typeof storeLatitude === "number" ? storeLatitude : null;
    const sLng = typeof storeLongitude === "number" ? storeLongitude : null;

    let nearbyRiderIds: string[] = [];
    if (sLat != null && sLng != null && allRiderIds.size > 0) {
      const sinceIso = new Date(Date.now() - FRESHNESS_MIN * 60_000).toISOString();
      const { data: locs } = await supabase
        .from("rider_locations")
        .select("rider_id, latitude, longitude")
        .gte("updated_at", sinceIso);
      nearbyRiderIds = (locs || [])
        .filter(
          (l: { rider_id: string; latitude: number; longitude: number }) =>
            allRiderIds.has(l.rider_id) &&
            haversineKm(sLat, sLng, Number(l.latitude), Number(l.longitude)) <= RADIUS_KM,
        )
        .map((l: { rider_id: string }) => l.rider_id);
    }

    const useNearby = nearbyRiderIds.length > 0;
    const targetRiderIds = useNearby ? nearbyRiderIds : Array.from(allRiderIds);

    console.log(
      `notify-rider dispatch: ${useNearby ? "NEARBY" : "BROADCAST"} — ` +
        `${targetRiderIds.length} rider(s), radius=${RADIUS_KM}km, freshness=${FRESHNESS_MIN}min`,
    );

    // Push
    fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey },
      body: JSON.stringify(
        useNearby
          ? {
              userIds: nearbyRiderIds,
              title: "New Pickup Available Near You!",
              body: `A new order from ${order.location_name} needs pickup. Accept it now!`,
              url: "/rider/available-pickups",
            }
          : {
              role: "rider",
              title: "New Pickup Available!",
              body: `A new order from ${order.location_name} needs pickup. Accept it now!`,
              url: "/rider/available-pickups",
            },
      ),
    }).catch((err: unknown) => console.error("Push notification error:", err));

    // Email — only the targeted riders. Fetch all profiles in ONE query
    // (avoids an N+1 round-trip per rider) and fan the emails out concurrently.
    if (targetRiderIds.length > 0) {
      const { data: riderProfiles } = await supabase
        .from("profiles")
        .select("full_name, email")
        .in("user_id", targetRiderIds);
      await Promise.allSettled(
        (riderProfiles ?? [])
          .filter((p: { email: string | null }) => !!p.email)
          .map((p: { full_name: string | null; email: string | null }) =>
            fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey },
              body: JSON.stringify({
                type: "rider_notified",
                data: {
                  email: p.email,
                  name: p.full_name,
                  orderId: order.id,
                  storeName: order.location_name,
                  deliveryAddress: deliveryAddress || null,
                  buyerName: buyerName || null,
                },
              }),
            }).catch(() => {}),
          ),
      );
    }

    // Record how this alert was dispatched (observability / future escalation).
    await supabase
      .from("rider_alerts")
      .update(
        useNearby
          ? { nearby_notified_at: new Date().toISOString() }
          : { broadcast_at: new Date().toISOString() },
      )
      .eq("id", alert?.id);

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
