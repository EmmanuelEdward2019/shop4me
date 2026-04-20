import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateOrderFees, type FeeCalculationInput, type FeeCalculationResult } from "@/lib/fee-calculator";

interface PlatformFees {
  /** Effective % for a given subtotal — defaults to first tier (10%) when unknown. */
  serviceFeePercentage: number;
  defaultDeliveryFee: number;
  surgeActive: boolean;
  surgeMultiplier: number;
  heavySurcharge: number;
  minDeliveryFee: number;
}

interface ServiceTier {
  min_subtotal: number;
  max_subtotal: number | null;
  percentage: number;
}

/**
 * Lightweight hook that exposes:
 * - Tiered service-fee calculator (instant, client-side, mirrors the edge function tiers)
 * - Default delivery fee + surge / heavy / minimum (for UI display only)
 * - `getQuote(input)` — async call to the canonical edge function for final pricing
 */
export const usePlatformSettings = () => {
  const [tiers, setTiers] = useState<ServiceTier[]>([
    { min_subtotal: 0, max_subtotal: 20000, percentage: 10 },
    { min_subtotal: 20001, max_subtotal: 50000, percentage: 7 },
    { min_subtotal: 50001, max_subtotal: null, percentage: 5 },
  ]);
  const [fees, setFees] = useState<PlatformFees>({
    serviceFeePercentage: 10,
    defaultDeliveryFee: 1500,
    surgeActive: false,
    surgeMultiplier: 1,
    heavySurcharge: 1000,
    minDeliveryFee: 1000,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tiersRes, settingsRes, deliveryRes] = await Promise.all([
          supabase
            .from("service_fee_tiers" as any)
            .select("min_subtotal, max_subtotal, percentage")
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
          supabase
            .from("delivery_fee_tiers" as any)
            .select("fee")
            .eq("is_active", true)
            .order("display_order", { ascending: true })
            .limit(1),
        ]);

        if (tiersRes.data && tiersRes.data.length) {
          setTiers(
            (tiersRes.data as any[]).map((t) => ({
              min_subtotal: Number(t.min_subtotal),
              max_subtotal: t.max_subtotal == null ? null : Number(t.max_subtotal),
              percentage: Number(t.percentage),
            })),
          );
        }

        const parsed: Record<string, any> = {};
        for (const row of (settingsRes.data ?? []) as any[]) {
          let v: any = row.value;
          if (typeof v === "string") {
            try { v = JSON.parse(v); } catch { /* keep */ }
          }
          parsed[row.key] = v;
        }

        setFees((prev) => ({
          ...prev,
          defaultDeliveryFee: deliveryRes.data?.[0]?.fee
            ? Number((deliveryRes.data as any[])[0].fee)
            : prev.defaultDeliveryFee,
          surgeActive: !!parsed.surge_active,
          surgeMultiplier: Number(parsed.surge_multiplier ?? 1) || 1,
          heavySurcharge: Number(parsed.heavy_order_surcharge ?? 1000) || 1000,
          minDeliveryFee: Number(parsed.minimum_delivery_fee ?? 1000) || 1000,
        }));
      } catch (err) {
        console.error("Failed to load platform settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /** Get the % bracket that applies to this subtotal. */
  const getServicePercentage = useCallback(
    (subtotal: number): number => {
      for (const tier of tiers) {
        const max = tier.max_subtotal ?? Infinity;
        if (subtotal >= tier.min_subtotal && subtotal <= max) {
          return tier.percentage;
        }
      }
      return tiers[tiers.length - 1]?.percentage ?? 10;
    },
    [tiers],
  );

  /** Tiered service fee, calculated locally — instant for live form preview. */
  const calculateServiceFee = useCallback(
    (subtotal: number): number => {
      const pct = getServicePercentage(subtotal);
      return Math.round((subtotal * pct) / 100);
    },
    [getServicePercentage],
  );

  /** Async quote via the edge function — use at checkout / invoice send. */
  const getQuote = useCallback(
    (input: FeeCalculationInput): Promise<FeeCalculationResult> =>
      calculateOrderFees(input),
    [],
  );

  return { fees, loading, tiers, calculateServiceFee, getServicePercentage, getQuote };
};
