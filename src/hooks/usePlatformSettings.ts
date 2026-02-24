import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformFees {
  defaultServiceFee: number;
  defaultDeliveryFee: number;
}

export const usePlatformSettings = () => {
  const [fees, setFees] = useState<PlatformFees>({
    defaultServiceFee: 1500,
    defaultDeliveryFee: 1500,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings" as any)
          .select("key, value")
          .in("key", ["default_service_fee", "default_delivery_fee"]);

        if (error) throw error;

        const settings: any = {};
        (data || []).forEach((row: any) => {
          settings[row.key] = typeof row.value === "number" ? row.value : Number(row.value);
        });

        setFees({
          defaultServiceFee: settings.default_service_fee ?? 1500,
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

  return { fees, loading };
};
