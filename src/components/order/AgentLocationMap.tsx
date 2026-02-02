import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface AgentLocationMapProps {
  agentLocation: {
    latitude: number;
    longitude: number;
  };
  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };
  agentName?: string;
  routeGeometry?: [number, number][];
  routeSteps?: RouteStep[];
  className?: string;
}

// Custom agent marker icon
const createAgentIcon = () => {
  return L.divIcon({
    className: "custom-agent-marker",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 76%, 46%));
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

// Custom delivery marker icon
const createDeliveryIcon = () => {
  return L.divIcon({
    className: "custom-delivery-marker",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, hsl(221, 83%, 53%), hsl(221, 83%, 63%));
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const AgentLocationMap = ({
  agentLocation,
  deliveryLocation,
  agentName = "Agent",
  routeGeometry,
  className = "",
}: AgentLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const agentMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([agentLocation.latitude, agentLocation.longitude], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add agent marker
    agentMarkerRef.current = L.marker(
      [agentLocation.latitude, agentLocation.longitude],
      { icon: createAgentIcon() }
    )
      .addTo(map)
      .bindPopup(`<strong>${agentName}</strong><br/>Current Location`);

    // Add delivery marker if provided
    if (deliveryLocation) {
      deliveryMarkerRef.current = L.marker(
        [deliveryLocation.latitude, deliveryLocation.longitude],
        { icon: createDeliveryIcon() }
      )
        .addTo(map)
        .bindPopup("<strong>Delivery Address</strong>");

      // Fit bounds
      const bounds = L.latLngBounds([
        [agentLocation.latitude, agentLocation.longitude],
        [deliveryLocation.latitude, deliveryLocation.longitude],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update agent marker position
  useEffect(() => {
    if (!mapInstanceRef.current || !agentMarkerRef.current) return;
    agentMarkerRef.current.setLatLng([agentLocation.latitude, agentLocation.longitude]);
  }, [agentLocation.latitude, agentLocation.longitude]);

  // Update route line when geometry changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing route
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Draw new route if geometry provided
    if (routeGeometry && routeGeometry.length > 0) {
      // OpenRouteService returns [lng, lat], Leaflet needs [lat, lng]
      const latLngs = routeGeometry.map(([lng, lat]) => [lat, lng] as [number, number]);
      
      routeLineRef.current = L.polyline(latLngs, {
        color: "hsl(221, 83%, 53%)",
        weight: 4,
        opacity: 0.8,
      }).addTo(mapInstanceRef.current);
    } else if (deliveryLocation) {
      // Fallback to straight line
      routeLineRef.current = L.polyline(
        [
          [agentLocation.latitude, agentLocation.longitude],
          [deliveryLocation.latitude, deliveryLocation.longitude],
        ],
        {
          color: "hsl(221, 83%, 53%)",
          weight: 3,
          opacity: 0.7,
          dashArray: "10, 10",
        }
      ).addTo(mapInstanceRef.current);
    }
  }, [routeGeometry, deliveryLocation, agentLocation]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-full min-h-[200px] rounded-lg overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};

export default AgentLocationMap;
