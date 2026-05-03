import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Radio, X } from "lucide-react";
import { useAgentLocationSharing } from "@/hooks/useAgentLocation";
import { cn } from "@/lib/utils";

interface LocationSharingToggleProps {
  orderId: string;
  agentId: string;
  orderStatus: string;
}

const LocationSharingToggle = ({
  orderId,
  agentId,
  orderStatus,
}: LocationSharingToggleProps) => {
  const isActiveOrder = orderStatus === "shopping" || orderStatus === "in_transit";

  const { isSharing, error, startSharing, stopSharing } = useAgentLocationSharing({
    orderId,
    agentId,
    enabled: false,
  });

  if (!isActiveOrder) {
    return null;
  }

  return (
    <Card className={cn(
      "border-2 transition-colors",
      isSharing ? "border-primary/50 bg-primary/5" : "border-border"
    )}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isSharing ? "bg-primary/20" : "bg-muted"
            )}>
              {isSharing ? (
                <Radio className="w-5 h-5 text-primary animate-pulse" />
              ) : (
                <MapPin className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">Location Sharing</p>
                {isSharing && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isSharing
                  ? "Buyer can see your live location"
                  : "Optional — lets the buyer track you and get a '5 min away' alert"}
              </p>
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </div>
          </div>

          <Button
            variant={isSharing ? "outline" : "default"}
            size="sm"
            onClick={isSharing ? stopSharing : startSharing}
            className={cn(
              isSharing && "border-destructive/50 text-destructive hover:bg-destructive/10"
            )}
          >
            {isSharing ? (
              <>
                <X className="w-4 h-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-1" />
                Start
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationSharingToggle;
