import { useCallback } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNativePlatform } from "./platform";

interface UseNativeCameraReturn {
  takePhoto: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
  isAvailable: boolean;
}

/**
 * Camera hook — uses Capacitor Camera on native, falls back to file input on web.
 * Returns a data URI or web URL of the captured/selected image.
 */
export const useNativeCamera = (): UseNativeCameraReturn => {
  const isAvailable = isNativePlatform();

  const takePhoto = useCallback(async (): Promise<string | null> => {
    try {
      const perms = await Camera.checkPermissions();
      if (perms.camera !== "granted") {
        const requested = await Camera.requestPermissions({ permissions: ["camera"] });
        if (requested.camera !== "granted") return null;
      }

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1200,
      });

      return image.webPath || null;
    } catch (err: any) {
      // User cancelled or error
      if (err?.message?.includes("cancelled") || err?.message?.includes("User cancelled")) {
        return null;
      }
      console.error("Camera error:", err);
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    try {
      const perms = await Camera.checkPermissions();
      if (perms.photos !== "granted") {
        const requested = await Camera.requestPermissions({ permissions: ["photos"] });
        if (requested.photos !== "granted") return null;
      }

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: 1200,
        height: 1200,
      });

      return image.webPath || null;
    } catch (err: any) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("User cancelled")) {
        return null;
      }
      console.error("Gallery error:", err);
      return null;
    }
  }, []);

  return { takePhoto, pickFromGallery, isAvailable };
};
