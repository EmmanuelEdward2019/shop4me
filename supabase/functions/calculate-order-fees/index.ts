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
//   "is_heavy_order": false                   // optional
// }
//
// Returns:
// {
//   subtotal, service_fee, service_fee_percentage,
//   delivery_fee, base_delivery_fee, distance_km,
//   surge_multiplier, surge_active, heavy_surcharge,
//   minimum_delivery_fee, total, breakdown
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
    ]);

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
    if (surgeActive) deliveryFee = Math.round(deliveryFee * surgeMultiplier);
    if (body.is_heavy_order) deliveryFee += heavySurcharge;
    if (deliveryFee < minDeliveryFee) deliveryFee = minDeliveryFee;

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
      total,
      breakdown: {
        service_tier_used: { percentage },
        delivery_tier_used:
          distanceKm != null
            ? { distance_km: distanceKm, base_fee: baseDeliveryFee }
            : null,
      },
    });
  } catch (err) {
    console.error("calculate-order-fees error:", err);
    return json({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
