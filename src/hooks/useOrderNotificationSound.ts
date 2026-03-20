import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Plays an in-app notification sound and triggers browser notification
 * when new orders/alerts arrive via Supabase Realtime.
 */
export const useOrderNotificationSound = (
  table: "orders" | "rider_alerts",
  options?: {
    filterColumn?: string;
    filterValue?: string;
    onNewRecord?: (payload: any) => void;
  }
) => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteracted = useRef(false);

  // Track user interaction for autoplay policy
  useEffect(() => {
    const handler = () => { hasInteracted.current = true; };
    document.addEventListener("click", handler, { once: true });
    document.addEventListener("touchstart", handler, { once: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!hasInteracted.current) return;
    
    try {
      // Create a simple notification tone using Web Audio API
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      
      // Pleasant notification chime: two quick tones
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);

      // Second tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.18); // D6
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.4);

      // Third tone (higher)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.42); // E6
      gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.42);
      gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc3.start(ctx.currentTime + 0.42);
      osc3.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/placeholder.svg",
        tag: `${table}-notification`,
      });
    }
  }, [table]);

  useEffect(() => {
    if (!user) return;

    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel(`${table}-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table,
        },
        (payload) => {
          const newRecord = payload.new as any;
          
          // For orders: notify agents about new pending orders
          if (table === "orders" && newRecord.status === "pending" && !newRecord.agent_id) {
            playNotificationSound();
            showBrowserNotification(
              "🛒 New Order Available!",
              `New order from ${newRecord.location_name}. Accept it now!`
            );
          }
          
          // For rider_alerts: notify riders about new pickup requests
          if (table === "rider_alerts" && newRecord.status === "pending" && !newRecord.rider_id) {
            playNotificationSound();
            showBrowserNotification(
              "🚴 New Pickup Available!",
              `Pickup from ${newRecord.store_location_name}. Accept it now!`
            );
          }

          options?.onNewRecord?.(newRecord);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, playNotificationSound, showBrowserNotification, options?.onNewRecord]);

  return { playNotificationSound };
};
