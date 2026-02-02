import { ChevronDown, ChevronUp, Navigation } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistance, formatDuration } from "@/hooks/useRouteDirections";
import { cn } from "@/lib/utils";

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface TurnByTurnDirectionsProps {
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  loading?: boolean;
}

const TurnByTurnDirections = ({
  steps,
  totalDistance,
  totalDuration,
  loading,
}: TurnByTurnDirectionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading || steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          <span>Turn-by-turn Directions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistance(totalDistance)} • {formatDuration(totalDuration)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <ScrollArea className="h-48 rounded-lg border bg-muted/50 p-3">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md",
                  index === 0 && "bg-primary/10"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{step.instruction}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(step.distance)} • {formatDuration(step.duration)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default TurnByTurnDirections;
