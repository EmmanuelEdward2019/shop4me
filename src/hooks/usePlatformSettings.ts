import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformFees {
  serviceFeePercentage: number;
  defaultDeliveryFee: number;
}

export const usePlatformSettings = () => {
  const [fees, setFees] = useState<PlatformFees>({
    serviceFeePercentage: 10,
    defaultDeliveryFee: 1500,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings" as any)
          .select("key, value")
          .in("key", ["service_fee_percentage", "default_delivery_fee"]);

        if (error) throw error;

        const settings: any = {};
        (data || []).forEach((row: any) => {
          settings[row.key] = typeof row.value === "number" ? row.value : Number(row.value);
        });

        setFees({
          serviceFeePercentage: settings.service_fee_percentage ?? 10,
          defaultDeliveryFee: settings.default_delivery_fee ?? 1500,
        });
      } catch (err) {
        console.error("Failed to load platform settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /** Calculate service fee from a subtotal */
  const calculateServiceFee = (subtotal: number) => {
    return Math.round(subtotal * (fees.serviceFeePercentage / 100));
  };

  return { fees, loading, calculateServiceFee };
};
