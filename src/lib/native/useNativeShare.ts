import { useCallback } from "react";
import { Share } from "@capacitor/share";
import { isNativePlatform } from "./platform";

/**
 * Native share sheet — uses OS share dialog on native, falls back to
 * Web Share API or clipboard on web.
 */
export const useNativeShare = () => {
  const shareOrder = useCallback(
    async (orderId: string, locationName: string) => {
      const url = `https://www.shop4meng.com/dashboard/orders/${orderId}`;
      const text = `Check out my Shop4Me order from ${locationName}`;

      if (isNativePlatform()) {
        await Share.share({ title: "Shop4Me Order", text, url, dialogTitle: "Share Order" });
      } else if (navigator.share) {
        await navigator.share({ title: "Shop4Me Order", text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    },
    []
  );

  const shareApp = useCallback(async () => {
    const url = "https://www.shop4meng.com";
    const text = "Shop4Me — Your personal shopping assistant in Nigeria!";

    if (isNativePlatform()) {
      await Share.share({ title: "Shop4Me", text, url, dialogTitle: "Share Shop4Me" });
    } else if (navigator.share) {
      await navigator.share({ title: "Shop4Me", text, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  return { shareOrder, shareApp };
};
