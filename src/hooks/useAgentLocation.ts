import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance } from "@/lib/eta-calculator";

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
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  buyerId?: string;
}

export const useAgentLocationSharing = ({
  orderId,
  agentId,
  enabled = true,
  deliveryLatitude,
  deliveryLongitude,
  buyerId,
}: UseAgentLocationOptions) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const proximityNotifiedRef = useRef(false);

  const sendProximityNotification = useCallback(async () => {
    if (!buyerId || proximityNotifiedRef.current) return;

    try {
      // Mark as notified in database
      await supabase
        .from("agent_locations")
        .update({ proximity_notified: true })
        .eq("order_id", orderId);

      // Create a delivery update
      await supabase.from("delivery_updates").insert({
        order_id: orderId,
        agent_id: agentId,
        update_type: "arrived_nearby",
        message: "Agent is approximately 5 minutes away!",
      });

      // Send push notification
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: buyerId,
          title: "🚗 Almost There!",
          body: "Your agent is about 5 minutes away from delivering your order.",
          data: {
            orderId,
            type: "proximity_alert",
          },
        },
      });

      proximityNotifiedRef.current = true;
      console.log("Proximity notification sent successfully");
    } catch (err) {
      console.error("Error sending proximity notification:", err);
    }
  }, [orderId, agentId, buyerId]);

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
          return;
        }

        // Check proximity for notification (if delivery location is provided)
        if (
          deliveryLatitude &&
          deliveryLongitude &&
          !proximityNotifiedRef.current
        ) {
          const distanceKm = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            deliveryLatitude,
            deliveryLongitude
          );

          // Approximately 5 minutes away (assuming ~20 km/h average speed in Lagos)
          // ~1.7 km = 5 min at 20 km/h
          if (distanceKm <= 1.7) {
            sendProximityNotification();
          }
        }
      } catch (err) {
        console.error("Error in updateLocation:", err);
      }
    },
    [agentId, orderId, deliveryLatitude, deliveryLongitude, sendProximityNotification]
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
        let errMsg = "Unable to get your location. Please try again.";
        if (err.code === 1) errMsg = "Location permission denied. Enable it in your browser settings.";
        else if (err.code === 2) errMsg = "Location unavailable. Check your device GPS.";
        else if (err.code === 3) errMsg = "Location request timed out. Please try again.";
        setError(errMsg);
        setIsSharing(false);
        toast({
          title: "Location Unavailable",
          description: errMsg,
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

  // Check if already notified on mount
  useEffect(() => {
    const checkProximityStatus = async () => {
      const { data } = await supabase
        .from("agent_locations")
        .select("proximity_notified")
        .eq("order_id", orderId)
        .single();

      if (data?.proximity_notified) {
        proximityNotifiedRef.current = true;
      }
    };

    checkProximityStatus();
  }, [orderId]);

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
