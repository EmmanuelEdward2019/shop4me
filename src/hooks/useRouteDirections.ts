import { useState, useEffect } from "react";

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface RouteData {
  geometry: [number, number][];
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  loading: boolean;
  error: string | null;
}

// OpenRouteService free tier (no API key needed for basic usage)
const ORS_API_URL = "https://api.openrouteservice.org/v2/directions/driving-car";

export const useRouteDirections = (
  startLat: number | null,
  startLng: number | null,
  endLat: number | null,
  endLng: number | null
): RouteData => {
  const [routeData, setRouteData] = useState<RouteData>({
    geometry: [],
    steps: [],
    totalDistance: 0,
    totalDuration: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!startLat || !startLng || !endLat || !endLng) {
      return;
    }

    const fetchRoute = async () => {
      setRouteData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Use OSRM (OpenStreetMap Routing Machine) - completely free, no API key
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Routing API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }

        const route = data.routes[0];
        const geometry = route.geometry.coordinates as [number, number][];
        
        // Parse steps from legs
        const steps: RouteStep[] = [];
        if (route.legs) {
          for (const leg of route.legs) {
            if (leg.steps) {
              for (const step of leg.steps) {
                steps.push({
                  instruction: formatInstruction(step),
                  distance: step.distance,
                  duration: step.duration,
                });
              }
            }
          }
        }

        setRouteData({
          geometry,
          steps,
          totalDistance: route.distance,
          totalDuration: route.duration,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching route:", error);
        setRouteData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch route",
        }));
      }
    };

    // Debounce the fetch to avoid too many requests
    const timeoutId = setTimeout(fetchRoute, 1000);
    return () => clearTimeout(timeoutId);
  }, [startLat, startLng, endLat, endLng]);

  return routeData;
};

// Format OSRM step into readable instruction
const formatInstruction = (step: any): string => {
  const maneuver = step.maneuver;
  const name = step.name || "the road";
  
  switch (maneuver?.type) {
    case "depart":
      return `Start on ${name}`;
    case "arrive":
      return "Arrive at destination";
    case "turn":
      return `Turn ${maneuver.modifier || ""} onto ${name}`.trim();
    case "new name":
      return `Continue onto ${name}`;
    case "merge":
      return `Merge onto ${name}`;
    case "on ramp":
    case "off ramp":
      return `Take the ramp onto ${name}`;
    case "fork":
      return `Take the ${maneuver.modifier || ""} fork onto ${name}`.trim();
    case "roundabout":
      return `At the roundabout, take exit onto ${name}`;
    case "continue":
      return `Continue on ${name}`;
    default:
      return `Continue on ${name}`;
  }
};

// Format distance for display
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

// Format duration for display
export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr ${remainingMinutes} min`;
};
