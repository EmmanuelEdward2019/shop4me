// Shared PWA / "Add to Home Screen" helpers.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** True on iPhone / iPod (and older iPad UAs). Modern iPadOS reports a desktop UA. */
export const isIOS = (): boolean =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as any).MSStream;

/** True only when the iOS browser is Safari (Add to Home Screen works there). */
export const isIOSSafari = (): boolean => {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  // Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS), Opera (OPiOS), Brave, etc.
  return /safari/i.test(ua) && !/crios|fxios|edgios|opios|mercury|brave/i.test(ua);
};

/** True when the app is launched from the installed home-screen icon. */
export const isStandalone = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true);

/** Fired when a "Download for iPhone" button wants to open the A2HS helper. */
export const A2HS_EVENT = "shop4me:add-to-home";

/** localStorage key remembering the user dismissed (or completed) the prompt. */
export const A2HS_DISMISSED_KEY = "shop4me:a2hs-dismissed";

export const wasA2HSDismissed = (): boolean => {
  try {
    return localStorage.getItem(A2HS_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

export const setA2HSDismissed = (): void => {
  try {
    localStorage.setItem(A2HS_DISMISSED_KEY, "1");
  } catch {
    /* storage unavailable — non-critical */
  }
};

export const openA2HSHelper = (): void => {
  window.dispatchEvent(new Event(A2HS_EVENT));
};
