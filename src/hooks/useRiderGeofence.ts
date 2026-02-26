import { useState, useEffect, useCallback, useRef } from "react";

interface GeofencePosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface UseRiderGeofenceOptions {
  storeLat: number | null;
  storeLng: number | null;
  radiusMeters?: number;
  watchEnabled?: boolean;
}

/**
 * Calculate distance between two GPS points using Haversine formula.
 * Returns distance in meters.
 */
export const calculateDistanceMeters = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export const useRiderGeofence = ({
  storeLat,
  storeLng,
  radiusMeters = 100,
  watchEnabled = true,
}: UseRiderGeofenceOptions) => {
  const [position, setPosition] = useState<GeofencePosition | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const updatePosition = useCallback(
    (pos: GeolocationPosition) => {
      const newPos: GeofencePosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setPosition(newPos);
      setLoading(false);

      if (storeLat != null && storeLng != null) {
        const dist = calculateDistanceMeters(
          newPos.latitude, newPos.longitude,
          storeLat, storeLng
        );
        setDistance(dist);
        setIsWithinRadius(dist <= radiusMeters);
      }
    },
    [storeLat, storeLng, radiusMeters]
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError("Location access denied. Please enable GPS in your browser settings.");
        break;
      case err.POSITION_UNAVAILABLE:
        setError("Location unavailable. Please check your GPS.");
        break;
      case err.TIMEOUT:
        setError("Location request timed out. Please try again.");
        break;
      default:
        setError("Unable to get your location.");
    }
  }, []);

  useEffect(() => {
    if (!watchEnabled || storeLat == null || storeLng == null) {
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get initial position
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [watchEnabled, storeLat, storeLng, updatePosition, handleError]);

  return {
    position,
    distance,
    isWithinRadius,
    error,
    loading,
    formattedDistance: distance != null ? formatDistance(distance) : null,
  };
};
