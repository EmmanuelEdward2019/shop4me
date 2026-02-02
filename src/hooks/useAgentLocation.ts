import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

interface UseAgentLocationOptions {
  orderId: string;
  agentId: string;
  enabled?: boolean;
}

export const useAgentLocationSharing = ({
  orderId,
  agentId,
  enabled = true,
}: UseAgentLocationOptions) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const updateLocation = useCallback(
    async (position: GeolocationPosition) => {
      try {
        const { error: upsertError } = await supabase
          .from("agent_locations")
          .upsert(
            {
              agent_id: agentId,
              order_id: orderId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "order_id" }
          );

        if (upsertError) {
          console.error("Error updating location:", upsertError);
          setError("Failed to update location");
        }
      } catch (err) {
        console.error("Error in updateLocation:", err);
      }
    },
    [agentId, orderId]
  );

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location sharing.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        updateLocation(position);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(err.message);
        setIsSharing(false);
        toast({
          title: "Location Error",
          description: err.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [updateLocation, toast]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);

    // Remove location from database
    try {
      await supabase
        .from("agent_locations")
        .delete()
        .eq("order_id", orderId)
        .eq("agent_id", agentId);
    } catch (err) {
      console.error("Error removing location:", err);
    }
  }, [orderId, agentId]);

  useEffect(() => {
    if (enabled) {
      startSharing();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, startSharing]);

  return {
    isSharing,
    error,
    startSharing,
    stopSharing,
  };
};

export const useAgentLocationTracking = (orderId: string) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial location
    const fetchLocation = async () => {
      const { data, error } = await supabase
        .from("agent_locations")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (!error && data) {
        setLocation({
          latitude: parseFloat(data.latitude as any),
          longitude: parseFloat(data.longitude as any),
          accuracy: data.accuracy ? parseFloat(data.accuracy as any) : undefined,
          heading: data.heading ? parseFloat(data.heading as any) : undefined,
          speed: data.speed ? parseFloat(data.speed as any) : undefined,
          updated_at: data.updated_at,
        });
      }
      setLoading(false);
    };

    fetchLocation();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`agent-location-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_locations",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setLocation(null);
          } else {
            const data = payload.new as any;
            setLocation({
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
              accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined,
              heading: data.heading ? parseFloat(data.heading) : undefined,
              speed: data.speed ? parseFloat(data.speed) : undefined,
              updated_at: data.updated_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { location, loading };
};
