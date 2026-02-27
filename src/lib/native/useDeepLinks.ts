import { useEffect } from "react";
import { App, URLOpenListenerEvent } from "@capacitor/app";
import { isNativePlatform } from "./platform";

/**
 * Deep link handler for Capacitor.
 * Listens for `shop4me://` URLs and calls the provided handler.
 */
export const useDeepLinks = (
  onDeepLink?: (url: string) => void
) => {
  useEffect(() => {
    if (!isNativePlatform() || !onDeepLink) return;

    const listener = App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      onDeepLink(event.url);
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [onDeepLink]);
};
