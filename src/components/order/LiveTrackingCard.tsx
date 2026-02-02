import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, Clock, Radio, Route, Timer } from "lucide-react";
import { useAgentLocationTracking } from "@/hooks/useAgentLocation";
import { useRouteDirections, formatDistance, formatDuration } from "@/hooks/useRouteDirections";
import { calculateETA, type ETAResult } from "@/lib/eta-calculator";
import { cn } from "@/lib/utils";
import AgentLocationMap from "./AgentLocationMap";
import DeliveryUpdatesFeed from "./DeliveryUpdatesFeed";
import TurnByTurnDirections from "./TurnByTurnDirections";

interface DeliveryLocation {
  latitude: number;
  longitude: number;
}

interface LiveTrackingCardProps {
  orderId: string;
  orderStatus: string;
  agentName?: string;
  deliveryLocation?: DeliveryLocation;
}

const LiveTrackingCard = ({
  orderId,
  orderStatus,
  agentName,
  deliveryLocation,
}: LiveTrackingCardProps) => {
  const { location, loading } = useAgentLocationTracking(orderId);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const isTrackable = orderStatus === "shopping" || orderStatus === "in_transit";

  // Fetch route directions when both locations are available
  const { geometry, steps, totalDistance, totalDuration, loading: routeLoading } = 
    useRouteDirections(
      location?.latitude ?? null,
      location?.longitude ?? null,
      deliveryLocation?.latitude ?? null,
      deliveryLocation?.longitude ?? null
    );

  // Calculate ETA from route data or fallback to haversine
  const eta = useMemo<ETAResult | null>(() => {
    if (!location || !deliveryLocation) return null;

    // If we have route data, use it for more accurate ETA
    if (totalDistance > 0 && totalDuration > 0) {
      const arrivalTime = new Date();
      const etaMinutes = Math.round(totalDuration / 60) + 5; // Add 5 min buffer
      arrivalTime.setMinutes(arrivalTime.getMinutes() + etaMinutes);

      return {
        distanceKm: totalDistance / 1000,
        distanceFormatted: formatDistance(totalDistance),
        etaMinutes,
        etaFormatted: formatDuration(totalDuration + 300), // +5 min buffer
        arrivalTime,
        arrivalTimeFormatted: arrivalTime.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }

    // Fallback to haversine calculation
    return calculateETA(
      location.latitude,
      location.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );
  }, [location, deliveryLocation, totalDistance, totalDuration]);

  useEffect(() => {
    if (location?.updated_at) {
      const updateTime = () => {
        const diff = Date.now() - new Date(location.updated_at).getTime();
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) {
          setLastUpdate("Just now");
        } else if (seconds < 3600) {
          const mins = Math.floor(seconds / 60);
          setLastUpdate(`${mins} min${mins > 1 ? "s" : ""} ago`);
        } else {
          setLastUpdate(
            new Date(location.updated_at).toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      };

      updateTime();
      const interval = setInterval(updateTime, 30000);
      return () => clearInterval(interval);
    }
  }, [location?.updated_at]);

  if (!isTrackable) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Radio className="w-5 h-5" />
            Live Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const statusLabel =
    orderStatus === "shopping" ? "Shopping in Progress" : "On the Way";
  const statusColor =
    orderStatus === "shopping"
      ? "bg-secondary/10 text-secondary-foreground"
      : "bg-primary/10 text-primary";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
            Live Tracking
          </CardTitle>
          <Badge className={cn("font-medium", statusColor)}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {location ? (
          <>
            {/* Interactive Map with route */}
            <div className="relative h-52 rounded-lg overflow-hidden border border-border">
              <AgentLocationMap
                agentLocation={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                deliveryLocation={deliveryLocation}
                agentName={agentName}
                routeGeometry={geometry}
              />
            </div>

            {/* ETA Display - Only show for in_transit orders */}
            {orderStatus === "in_transit" && eta && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-primary/10 rounded-lg text-center">
                  <Timer className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-primary">
                    {eta.etaFormatted}
                  </p>
                  <p className="text-xs text-muted-foreground">ETA</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Route className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">
                    {eta.distanceFormatted}
                  </p>
                  <p className="text-xs text-muted-foreground">Distance</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">
                    {eta.arrivalTimeFormatted}
                  </p>
                  <p className="text-xs text-muted-foreground">Arrival</p>
                </div>
              </div>
            )}

            {/* Turn-by-turn directions */}
            {orderStatus === "in_transit" && steps.length > 0 && (
              <TurnByTurnDirections
                steps={steps}
                totalDistance={totalDistance}
                totalDuration={totalDuration}
                loading={routeLoading}
              />
            )}

            {/* Delivery Updates Feed */}
            <DeliveryUpdatesFeed orderId={orderId} />

            {/* Status info */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  {agentName || "Agent"} is active
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{lastUpdate}</span>
              </div>
            </div>

            {/* Speed indicator */}
            {location.speed !== undefined && location.speed > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="w-4 h-4" />
                <span>Moving at {Math.round(location.speed * 3.6)} km/h</span>
              </div>
            )}
          </>
        ) : (
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <Radio className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Waiting for agent to share location...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTrackingCard;
