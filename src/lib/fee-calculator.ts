import { supabase } from "@/integrations/supabase/client";

export interface FeeCalculationInput {
  subtotal: number;
  store_lat?: number | null;
  store_lng?: number | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  buyer_zone?: string | null;
  store_zone?: string | null;
  is_heavy_order?: boolean;
}

export interface FeeCalculationResult {
  subtotal: number;
  service_fee: number;
  service_fee_percentage: number;
  delivery_fee: number;
  base_delivery_fee: number;
  distance_km: number | null;
  surge_active: boolean;
  surge_multiplier: number;
  heavy_surcharge: number;
  minimum_delivery_fee: number;
  total: number;
}

/**
 * Server-side calculator — guarantees the same numbers on web + mobile.
 * Falls back to a reasonable client-side estimate if the edge function fails,
 * so checkout never blocks on a network blip.
 */
export async function calculateOrderFees(
  input: FeeCalculationInput,
): Promise<FeeCalculationResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "calculate-order-fees",
      { body: input },
    );
    if (error) throw error;
    return data as FeeCalculationResult;
  } catch (err) {
    console.warn("calculate-order-fees fallback:", err);
    const subtotal = input.subtotal;
    const pct = subtotal <= 20000 ? 10 : subtotal <= 50000 ? 7 : 5;
    const serviceFee = Math.round((subtotal * pct) / 100);
    const deliveryFee = 1500;
    return {
      subtotal,
      service_fee: serviceFee,
      service_fee_percentage: pct,
      delivery_fee: deliveryFee,
      base_delivery_fee: deliveryFee,
      distance_km: null,
      surge_active: false,
      surge_multiplier: 1,
      heavy_surcharge: 0,
      minimum_delivery_fee: 1000,
      total: subtotal + serviceFee + deliveryFee,
    };
  }
}

/** Haversine distance in km — exposed for UI previews. */
export function haversineKm(
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
