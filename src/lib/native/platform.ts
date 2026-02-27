import { Capacitor } from "@capacitor/core";

/** Returns true when running inside a native iOS/Android shell */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/** Returns "ios" | "android" | "web" */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};
