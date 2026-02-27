import { useEffect, useCallback, useRef } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { isNativePlatform } from "./platform";
import { supabase } from "@/integrations/supabase/client";

interface UseNativePushOptions {
  userId: string | undefined;
  onNotificationReceived?: (title: string, body: string, data?: any) => void;
  onNotificationTapped?: (data: any) => void;
}

/**
 * Native push notifications via Capacitor.
 * Registers the device token with Supabase (expo_push_tokens table)
 * and handles foreground/tap events.
 *
 * On web this is a no-op — web push is handled by the service worker.
 */
export const useNativePush = ({
  userId,
  onNotificationReceived,
  onNotificationTapped,
}: UseNativePushOptions) => {
  const registered = useRef(false);

  const register = useCallback(async () => {
    if (!isNativePlatform() || !userId || registered.current) return;

    try {
      const permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== "granted") {
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive !== "granted") return;
      }

      await PushNotifications.register();

      // Listen for the registration token
      PushNotifications.addListener("registration", async (token) => {
        registered.current = true;

        // Upsert token to Supabase
        const { error } = await supabase
          .from("expo_push_tokens")
          .upsert(
            {
              user_id: userId,
              token: token.value,
              platform: (await import("@capacitor/core")).Capacitor.getPlatform(),
              device_name: navigator.userAgent.slice(0, 100),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" }
          );

        if (error) console.error("Failed to save push token:", error);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err);
      });

      // Foreground notifications
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        onNotificationReceived?.(
          notification.title || "",
          notification.body || "",
          notification.data
        );
      });

      // Notification tapped (app was in background)
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        onNotificationTapped?.(action.notification.data);
      });
    } catch (err) {
      console.error("Push notification setup error:", err);
    }
  }, [userId, onNotificationReceived, onNotificationTapped]);

  useEffect(() => {
    register();

    return () => {
      if (isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [register]);

  const unregister = useCallback(async () => {
    if (!isNativePlatform() || !userId) return;

    try {
      // Remove token from DB
      const permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "granted") {
        await supabase
          .from("expo_push_tokens")
          .delete()
          .eq("user_id", userId);
      }
    } catch (err) {
      console.error("Push unregister error:", err);
    }
  }, [userId]);

  return { register, unregister, isAvailable: isNativePlatform() };
};
