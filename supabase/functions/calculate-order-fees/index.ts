// Shop4Me — calculate-order-fees
// Single source of truth for fee calculation, used by web + React Native.
//
// POST body (JSON):
// {
//   "subtotal":       12500,                  // required
//   "store_lat":      4.8403, "store_lng": 7.0044,   // optional
//   "delivery_lat":   4.8156, "delivery_lng": 7.0498,// optional
//   "buyer_zone":     "choba",                // optional fallback
//   "store_zone":     "rumuola",              // optional fallback
//   "is_heavy_order": false,                  // optional
//   "order_id":       "uuid"                  // optional — identifies the buyer
// }
//
// Returns:
// {
//   subtotal, service_fee, service_fee_percentage,
//   delivery_fee, base_delivery_fee, distance_km,
//   surge_multiplier, surge_active, heavy_surcharge,
//   minimum_delivery_fee, total, breakdown,
//   first_order_free_delivery        // true when the waiver was applied
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Haversine distance in km between two GPS points. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return json({ error: "subtotal must be a non-negative number" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch all config in parallel
    const [
      serviceTiersRes,
      deliveryTiersRes,
      settingsRes,
      centroidsRes,
      promoRes,
    ] = await Promise.all([
      supabase
        .from("service_fee_tiers")
        .select("min_subtotal, max_subtotal, percentage")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("delivery_fee_tiers")
        .select("min_km, max_km, fee")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [
          "surge_active",
          "surge_multiplier",
          "heavy_order_surcharge",
          "minimum_delivery_fee",
        ]),
      supabase.from("zone_centroids").select("zone_slug, latitude, longitude"),
      supabase
        .from("bonuses")
        .select("id")
        .eq("type", "first_order_free_delivery")
        .eq("is_active", true)
        .limit(1),
    ]);

    // ---------- WHO IS THE BUYER? ----------
    // Never taken from the request body: a client that could simply name a
    // buyer_id could claim a fresh account's waiver at will.
    //
    // Two callers price an order, and they are not the same person:
    //   * the buyer, pricing their own basket — no order row exists yet, so
    //     they are resolved from their own JWT;
    //   * the AGENT, pricing the invoice that sets the final charge — the JWT
    //     is the agent's, so the call must name the order and the buyer is
    //     read from that row.
    //
    // The role check is what makes the JWT fallback safe. Without it, an agent
    // whose client does not send order_id resolves to themselves; agents rarely
    // shop as buyers, so they stay "first-order eligible" indefinitely and every
    // invoice they write would be waived — and rider earnings, which are an
    // 85/15 split of orders.delivery_fee, would be zeroed along with it.
    // Shipped app builds do exactly that, so this is not a theoretical case.
    //
    // The whole block is defensive: a failure here must never break pricing,
    // so it degrades to "no waiver" rather than propagating.
    let buyerId: string | null = null;
    const promoLive = (promoRes.data?.length ?? 0) > 0;

    if (promoLive) {
      try {
        if (body.order_id) {
          const { data: orderRow } = await supabase
            .from("orders")
            .select("user_id")
            .eq("id", body.order_id)
            .maybeSingle();
          buyerId = orderRow?.user_id ?? null;
        } else {
          const authHeader = req.headers.get("Authorization") ?? "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (token) {
            const { data: userData } = await supabase.auth.getUser(token);
            const callerId = userData?.user?.id ?? null;
            if (callerId) {
              const { data: roleRows } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", callerId);
              const isStaff = (roleRows ?? []).some((r: { role: string }) =>
                r.role === "agent" || r.role === "rider" || r.role === "admin"
              );
              // Only someone acting purely as a buyer may claim the waiver
              // from their own token.
              buyerId = isStaff ? null : callerId;
            }
          }
        }
      } catch (err) {
        console.error("buyer resolution failed, skipping waiver:", err);
        buyerId = null;
      }
    }

    let firstOrderFreeDelivery = false;
    if (promoLive && buyerId) {
      const { data: eligible, error: eligibleErr } = await supabase.rpc(
        "is_first_order_delivery_free",
        {
          p_buyer_id: buyerId,
          p_order_id: body.order_id ?? null,
          // Lets a promo carrying a minimum-order threshold be honoured.
          p_subtotal: subtotal,
        },
      );
      if (eligibleErr) {
        // Never block checkout on the promo lookup — just don't waive.
        console.error("is_first_order_delivery_free failed:", eligibleErr);
      } else {
        firstOrderFreeDelivery = eligible === true;
      }
    }

    const serviceTiers = serviceTiersRes.data ?? [];
    const deliveryTiers = deliveryTiersRes.data ?? [];
    const centroids = centroidsRes.data ?? [];

    // Parse settings (jsonb may already be a number/bool, or a quoted string)
    const settings: Record<string, any> = {};
    for (const row of settingsRes.data ?? []) {
      let v: any = row.value;
      if (typeof v === "string") {
        try {
          v = JSON.parse(v);
        } catch {
          /* leave as string */
        }
      }
      settings[row.key] = v;
    }
    const surgeActive = !!settings.surge_active;
    const surgeMultiplier = Number(settings.surge_multiplier ?? 1) || 1;
    const heavySurcharge = Number(settings.heavy_order_surcharge ?? 0) || 0;
    const minDeliveryFee = Number(settings.minimum_delivery_fee ?? 1000) || 1000;

    // ---------- SERVICE FEE (tiered) ----------
    let percentage = 10;
    for (const tier of serviceTiers) {
      const min = Number(tier.min_subtotal);
      const max = tier.max_subtotal == null ? Infinity : Number(tier.max_subtotal);
      if (subtotal >= min && subtotal <= max) {
        percentage = Number(tier.percentage);
        break;
      }
    }
    const serviceFee = Math.round((subtotal * percentage) / 100);

    // ---------- DELIVERY FEE (distance tiered) ----------
    let storeLat = body.store_lat != null ? Number(body.store_lat) : null;
    let storeLng = body.store_lng != null ? Number(body.store_lng) : null;
    let deliveryLat =
      body.delivery_lat != null ? Number(body.delivery_lat) : null;
    let deliveryLng =
      body.delivery_lng != null ? Number(body.delivery_lng) : null;

    // Zone-centroid fallback when GPS missing
    const findCentroid = (slug?: string | null) =>
      slug ? centroids.find((c) => c.zone_slug === slug) ?? null : null;
    if ((storeLat == null || storeLng == null) && body.store_zone) {
      const c = findCentroid(body.store_zone);
      if (c) {
        storeLat = Number(c.latitude);
        storeLng = Number(c.longitude);
      }
    }
    if ((deliveryLat == null || deliveryLng == null) && body.buyer_zone) {
      const c = findCentroid(body.buyer_zone);
      if (c) {
        deliveryLat = Number(c.latitude);
        deliveryLng = Number(c.longitude);
      }
    }

    let distanceKm: number | null = null;
    if (
      storeLat != null && storeLng != null &&
      deliveryLat != null && deliveryLng != null
    ) {
      distanceKm = haversineKm(storeLat, storeLng, deliveryLat, deliveryLng);
    }

    // Pick tier
    let baseDeliveryFee = 0;
    if (distanceKm != null && deliveryTiers.length) {
      const km = distanceKm;
      const tier = deliveryTiers.find((t) => {
        const min = Number(t.min_km);
        const max = t.max_km == null ? Infinity : Number(t.max_km);
        return km >= min && km <= max;
      });
      baseDeliveryFee = tier ? Number(tier.fee) : Number(deliveryTiers[deliveryTiers.length - 1].fee);
    } else if (deliveryTiers.length) {
      // No distance available at all → use the smallest tier as a fallback
      baseDeliveryFee = Number(deliveryTiers[0].fee);
    }

    let deliveryFee = baseDeliveryFee;
    if (firstOrderFreeDelivery) {
      // Only the BASE fee is waived. Surge multiplies the base, so it falls out
      // to zero with it; a heavy-order surcharge is still charged. The minimum
      // delivery fee is deliberately skipped — applying it would floor the
      // "free" delivery straight back up to a charge.
      deliveryFee = body.is_heavy_order ? heavySurcharge : 0;
    } else {
      if (surgeActive) deliveryFee = Math.round(deliveryFee * surgeMultiplier);
      if (body.is_heavy_order) deliveryFee += heavySurcharge;
      if (deliveryFee < minDeliveryFee) deliveryFee = minDeliveryFee;
    }

    const total = subtotal + serviceFee + deliveryFee;

    return json({
      subtotal,
      service_fee: serviceFee,
      service_fee_percentage: percentage,
      delivery_fee: deliveryFee,
      base_delivery_fee: baseDeliveryFee,
      distance_km: distanceKm,
      surge_active: surgeActive,
      surge_multiplier: surgeActive ? surgeMultiplier : 1,
      heavy_surcharge: body.is_heavy_order ? heavySurcharge : 0,
      minimum_delivery_fee: minDeliveryFee,
      first_order_free_delivery: firstOrderFreeDelivery,
      total,
      breakdown: {
        service_tier_used: { percentage },
        delivery_tier_used:
          distanceKm != null
            ? { distance_km: distanceKm, base_fee: baseDeliveryFee }
            : null,
        first_order_waiver_applied: firstOrderFreeDelivery,
      },
    });
  } catch (err) {
    console.error("calculate-order-fees error:", err);
    return json({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
