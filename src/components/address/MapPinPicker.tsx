import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface ReverseGeocodedAddress {
  address_line1: string;
  city: string;
  state: string;
  landmark?: string;
}

interface MapPinPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressResolved?: (address: ReverseGeocodedAddress) => void;
}

const ClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const FlyTo = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 1.2 });
  }, [center[0], center[1]]);
  return null;
};

/** Reverse geocode via Nominatim. Includes a small timeout. */
const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodedAddress | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
      {
        headers: { "Accept-Language": "en", "Accept": "application/json" },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const road =
      addr.road || addr.pedestrian || addr.footway || addr.cycleway || addr.path || addr.residential || "";
    const houseNumber = addr.house_number || "";

    // Nigerian addresses often lack a road field in Nominatim — fall through to
    // neighbourhood/suburb names, then use the first two parts of display_name.
    let addressLine1 = "";
    if (houseNumber && road) {
      addressLine1 = `${houseNumber} ${road}`;
    } else if (road) {
      addressLine1 = road;
    } else {
      const areaName =
        addr.neighbourhood || addr.suburb || addr.quarter ||
        addr.city_district || addr.village || addr.hamlet || "";
      if (areaName) {
        addressLine1 = areaName;
      } else {
        const parts = (data.display_name || "")
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean);
        addressLine1 = parts.slice(0, 2).join(", ");
      }
    }

    const city =
      addr.city || addr.town || addr.village || addr.hamlet ||
      addr.suburb || addr.county || addr.state_district || "";
    const state = addr.state || "";
    const landmark = addr.suburb || addr.neighbourhood || addr.quarter || undefined;

    return {
      address_line1: addressLine1,
      city,
      state,
      landmark,
    };
  } catch (err) {
    console.warn("reverseGeocode failed:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const MapPinPicker = ({ latitude, longitude, onLocationSelect, onAddressResolved }: MapPinPickerProps) => {
  // Default center: Port Harcourt
  const defaultCenter: [number, number] = [4.8156, 7.0498];
  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null,
  );
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const resolveAddress = useCallback(
    async (lat: number, lng: number) => {
      if (!onAddressResolved) return;
      setResolving(true);
      const result = await reverseGeocode(lat, lng);
      setResolving(false);
      if (result) {
        onAddressResolved(result);
      } else {
        toast.error("Couldn't auto-fill address. Please type it in manually.");
      }
    },
    [onAddressResolved],
  );

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
      void resolveAddress(lat, lng);
    },
    [onLocationSelect, resolveAddress],
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location access.");
      return;
    }
    if (!window.isSecureContext) {
      toast.error("Location access requires a secure (HTTPS) connection.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setFlyTarget([lat, lng]);
        onLocationSelect(lat, lng);
        setLocating(false);
        void resolveAddress(lat, lng);
      },
      (err) => {
        setLocating(false);
        console.warn("geolocation failed:", err);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Enable it in your browser settings, or tap the map to drop a pin.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error("Couldn't determine your location. Try moving outdoors or tap the map to drop a pin.");
        } else if (err.code === err.TIMEOUT) {
          toast.error("Location request timed out. Try again or tap the map to drop a pin.");
        } else {
          toast.error("Couldn't get your location. Tap the map to drop a pin instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const center = position || defaultCenter;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 min-w-0">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Tap the map or use GPS to drop a pin</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 flex-shrink-0"
          onClick={handleUseMyLocation}
          disabled={locating}
        >
          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          Use my location
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 220 }}>
        <MapContainer
          center={center}
          zoom={position ? 16 : 13}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onLocationSelect={handleClick} />
          {flyTarget && <FlyTo center={flyTarget} />}
          {position && <Marker position={position} icon={defaultIcon} />}
        </MapContainer>
      </div>

      {position && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          📍 {position[0].toFixed(5)}, {position[1].toFixed(5)}
          {resolving && (
            <span className="inline-flex items-center gap-1 text-muted-foreground/80">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up address…
            </span>
          )}
        </p>
      )}
    </div>
  );
};

export default MapPinPicker;
