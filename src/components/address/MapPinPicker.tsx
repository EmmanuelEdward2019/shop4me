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

interface MapPinPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
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

const MapPinPicker = ({ latitude, longitude, onLocationSelect }: MapPinPickerProps) => {
  // Default center: Port Harcourt
  const defaultCenter: [number, number] = [4.8156, 7.0498];
  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
    },
    [onLocationSelect]
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setFlyTarget([lat, lng]);
        onLocationSelect(lat, lng);
        setLocating(false);
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
