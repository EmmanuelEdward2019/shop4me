import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation, Clock, Radio } from "lucide-react";
import { useAgentLocationTracking } from "@/hooks/useAgentLocation";
import { cn } from "@/lib/utils";

interface LiveTrackingCardProps {
  orderId: string;
  orderStatus: string;
  agentName?: string;
}

const LiveTrackingCard = ({
  orderId,
  orderStatus,
  agentName,
}: LiveTrackingCardProps) => {
  const { location, loading } = useAgentLocationTracking(orderId);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const isTrackable = orderStatus === "shopping" || orderStatus === "in_transit";

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
          <Skeleton className="h-32 w-full rounded-lg" />
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
            {/* Map placeholder - in a real app, integrate with a map library */}
            <div className="relative h-40 bg-muted rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="text-center space-y-2">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                      <MapPin className="w-6 h-6 text-primary animate-bounce" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-ping" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {agentName || "Agent"} is active
                  </p>
                </div>
              </div>
              
              {/* Location coordinates overlay */}
              <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-md p-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                  {location.accuracy && (
                    <span className="text-muted-foreground">
                      ±{Math.round(location.accuracy)}m
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status info */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  Location Active
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
          <div className="h-40 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
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
