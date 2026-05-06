import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useOrderNotificationSound = (
  table: "orders" | "rider_alerts",
  options?: {
    filterColumn?: string;
    filterValue?: string;
    onNewRecord?: (payload: any) => void;
  }
) => {
  const { user } = useAuth();
  const hasInteracted = useRef(false);

  // Track first user interaction so AudioContext is allowed to play
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
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const play = (freq: number, start: number, end: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + end);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + end);
      };
      play(880, 0, 0.15);
      play(1174.66, 0.18, 0.4);
      play(1318.51, 0.42, 0.7);
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  }, []);

  // Show an OS-level notification via the service worker so it appears in the
  // device notification shade with sound — even when the browser tab is in background.
  const showBrowserNotification = useCallback(async (title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: "/logo.png",
          badge: "/favicon.png",
          tag: `${table}-notification`,
          renotify: true,
          silent: false,
          vibrate: [200, 100, 200],
          data: { url: "/dashboard" },
        } as NotificationOptions);
      } else {
        // Fallback for desktop browsers without SW (rare)
        new Notification(title, { body, icon: "/logo.png" });
      }
    } catch (e) {
      console.warn("Could not show notification:", e);
    }
  }, [table]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`${table}-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table },
        (payload) => {
          const rec = payload.new as any;

          if (table === "orders" && rec.status === "pending" && !rec.agent_id) {
            playNotificationSound();
            showBrowserNotification(
              "New Order Available!",
              `New order at ${rec.location_name}. Accept it now!`
            );
          }

          if (table === "rider_alerts" && rec.status === "pending" && !rec.rider_id) {
            playNotificationSound();
            showBrowserNotification(
              "New Pickup Available!",
              `Pickup from ${rec.store_location_name}. Accept it now!`
            );
          }

          options?.onNewRecord?.(rec);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, table, playNotificationSound, showBrowserNotification, options?.onNewRecord]);

  return { playNotificationSound };
};
