import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
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

/** Clicks on the map set the pin */
const ClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

/** Flies the map to a new center */
const FlyTo = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 1.2 });
  }, [center[0], center[1]]);
  return null;
};

const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodedAddress | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const road = addr.road || addr.pedestrian || addr.footway || "";
    const houseNumber = addr.house_number || "";
    const addressLine1 = houseNumber ? `${houseNumber} ${road}`.trim() : road || data.display_name?.split(",")[0] || "";

    const city =
      addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
    const state = addr.state || "";
    const suburb = addr.suburb || addr.neighbourhood || "";

    return {
      address_line1: addressLine1,
      city,
      state,
      landmark: suburb || undefined,
    };
  } catch {
    return null;
  }
};

const MapPinPicker = ({ latitude, longitude, onLocationSelect, onAddressResolved }: MapPinPickerProps) => {
  // Default center: Port Harcourt
  const defaultCenter: [number, number] = [4.8156, 7.0498];
  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const resolveAddress = useCallback(
    async (lat: number, lng: number) => {
      if (!onAddressResolved) return;
      const result = await reverseGeocode(lat, lng);
      if (result) onAddressResolved(result);
    },
    [onAddressResolved]
  );

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
      resolveAddress(lat, lng);
    },
    [onLocationSelect, resolveAddress]
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    // Must call getCurrentPosition synchronously inside the click handler
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setFlyTarget([lat, lng]);
        onLocationSelect(lat, lng);
        setLocating(false);
        resolveAddress(lat, lng);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const center = position || defaultCenter;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Tap the map to drop a pin at your delivery location
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
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
        <p className="text-xs text-muted-foreground">
          📍 {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default MapPinPicker;
