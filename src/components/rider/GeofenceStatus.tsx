import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface GeofenceStatusProps {
  distance: number | null;
  formattedDistance: string | null;
  isWithinRadius: boolean;
  loading: boolean;
  error: string | null;
  radiusMeters?: number;
}

const GeofenceStatus = ({
  distance,
  formattedDistance,
  isWithinRadius,
  loading,
  error,
  radiusMeters = 100,
}: GeofenceStatusProps) => {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Getting your location...</span>
      </div>
    );
  }

  if (isWithinRadius) {
    return (
      <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-green-50 text-green-700 border border-green-200">
        <CheckCircle className="w-4 h-4 shrink-0" />
        <span className="font-medium">You're at the store ({formattedDistance} away)</span>
      </div>
    );
  }

  // Calculate urgency color based on distance
  const getUrgencyColor = () => {
    if (distance == null) return "bg-muted text-muted-foreground";
    if (distance <= 200) return "bg-amber-50 text-amber-700 border border-amber-200";
    if (distance <= 500) return "bg-orange-50 text-orange-700 border border-orange-200";
    return "bg-red-50 text-red-700 border border-red-200";
  };

  return (
    <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${getUrgencyColor()}`}>
      <Navigation className="w-4 h-4 shrink-0" />
      <span>
        <span className="font-semibold">{formattedDistance}</span> from store
        {distance != null && distance > radiusMeters && (
          <span className="text-xs ml-1 opacity-75">
            (must be within {radiusMeters}m)
          </span>
        )}
      </span>
    </div>
  );
};

export default GeofenceStatus;
