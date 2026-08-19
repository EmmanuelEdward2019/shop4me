// Public store listings for the Shop4Me native apps.
// Override without editing code via env if a listing URL ever changes.

export const APP_STORE_URL =
  (import.meta.env.VITE_APP_STORE_URL as string | undefined) ||
  "https://apps.apple.com/app/shop4me-app/id6795087455";

export const PLAY_STORE_URL =
  (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) ||
  "https://play.google.com/store/apps/details?id=com.shop4meng.app";
