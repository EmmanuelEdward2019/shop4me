import { useCallback } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativePlatform } from "./platform";

/**
 * Haptic feedback hook — triggers device vibration on native, no-op on web.
 */
export const useHaptics = () => {
  const available = isNativePlatform();

  const impact = useCallback(
    async (style: "light" | "medium" | "heavy" = "medium") => {
      if (!available) return;
      const map = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: map[style] });
    },
    [available]
  );

  const notification = useCallback(
    async (type: "success" | "warning" | "error" = "success") => {
      if (!available) return;
      const map = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: map[type] });
    },
    [available]
  );

  const selectionChanged = useCallback(async () => {
    if (!available) return;
    await Haptics.selectionChanged();
  }, [available]);

  const vibrate = useCallback(
    async (duration = 300) => {
      if (!available) return;
      await Haptics.vibrate({ duration });
    },
    [available]
  );

  return { impact, notification, selectionChanged, vibrate, isAvailable: available };
};
