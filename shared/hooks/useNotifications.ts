/**
 * Shared useNotifications hook
 * Handles BOTH web push (via Service Worker) and native push (via Capacitor).
 * Platform detection is automatic.
 */

import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

interface UseNotificationsOptions {
  client: SupabaseClient;
  userId: string | undefined;
  /** Called when a notification is received while app is in foreground (native only) */
  onForegroundNotification?: (title: string, body: string, data?: any) => void;
  /** Called when user taps a notification (native only) */
  onNotificationTapped?: (data: any) => void;
}

interface UseNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: string;
  /** "web" | "native" | "none" */
  channel: "web" | "native" | "none";
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export const useNotifications = ({
  client,
  userId,
  onForegroundNotification,
  onNotificationTapped,
}: UseNotificationsOptions): UseNotificationsReturn => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<string>("default");

  // Detect platform
  const isNative = typeof window !== "undefined" && (() => {
    try {
      const { Capacitor } = require("@capacitor/core");
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  })();

  const isWebSupported =
    !isNative &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const isSupported = isNative || isWebSupported;
  const channel: "web" | "native" | "none" = isNative
    ? "native"
    : isWebSupported
    ? "web"
    : "none";

  // Check existing subscription on mount
  useEffect(() => {
    if (!userId) return;

    if (isWebSupported) {
      checkWebSubscription();
    }
    if (isNative) {
      checkNativeSubscription();
    }
  }, [userId, isWebSupported, isNative]);

  // ── Web Push ─────────────────────────────────────────────────

  const checkWebSubscription = useCallback(async () => {
    try {
      if (!("serviceWorker" in navigator)) return;
      setPermission(Notification.permission);
      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err) {
      console.error("Check web subscription error:", err);
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeWeb = async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      const { error } = await client.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh,
          auth: subJson.keys!.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) throw error;
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Web push subscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeWeb = async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await client
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Web push unsubscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ── Native Push (Capacitor) ──────────────────────────────────

  const checkNativeSubscription = useCallback(async () => {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.checkPermissions();
      setPermission(perm.receive);
      setIsSubscribed(perm.receive === "granted");
    } catch (err) {
      console.error("Check native subscription error:", err);
    }
  }, []);

  const subscribeNative = async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const { Capacitor } = await import("@capacitor/core");

      const perm = await PushNotifications.checkPermissions();
      if (perm.receive !== "granted") {
        const requested = await PushNotifications.requestPermissions();
        setPermission(requested.receive);
        if (requested.receive !== "granted") return false;
      }

      await PushNotifications.register();

      // Token registration
      PushNotifications.addListener("registration", async (token) => {
        const { error } = await client.from("expo_push_tokens").upsert(
          {
            user_id: userId,
            token: token.value,
            platform: Capacitor.getPlatform(),
            device_name: navigator.userAgent.slice(0, 100),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );
        if (error) console.error("Save native token error:", error);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Native push registration error:", err);
      });

      // Foreground
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        onForegroundNotification?.(
          notification.title || "",
          notification.body || "",
          notification.data
        );
      });

      // Tap
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        onNotificationTapped?.(action.notification.data);
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Native push subscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeNative = async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
      await client.from("expo_push_tokens").delete().eq("user_id", userId);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Native push unsubscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ── Unified API ──────────────────────────────────────────────

  const subscribe = isNative ? subscribeNative : subscribeWeb;
  const unsubscribe = isNative ? unsubscribeNative : unsubscribeWeb;

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    channel,
    subscribe,
    unsubscribe,
  };
};
