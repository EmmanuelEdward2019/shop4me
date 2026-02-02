import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryTimeEstimateProps {
  locationType: string;
  itemCount: number;
  className?: string;
}

const getEstimatedTime = (locationType: string, itemCount: number): { min: number; max: number } => {
  // Base time based on location type (in minutes)
  let baseTime = {
    min: 60, // 1 hour minimum
    max: 120, // 2 hours maximum
  };

  // Adjust based on location type
  if (locationType === "market") {
    // Markets are typically more complex to navigate
    baseTime = { min: 90, max: 180 }; // 1.5-3 hours
  } else if (locationType === "mall") {
    // Malls are generally easier to navigate
    baseTime = { min: 45, max: 120 }; // 45min-2 hours
  }

  // Adjust based on item count
  const itemTimeAdjustment = Math.floor(itemCount / 3) * 15; // +15 min per 3 items

  return {
    min: baseTime.min + itemTimeAdjustment,
    max: baseTime.max + itemTimeAdjustment,
  };
};

const formatTimeRange = (min: number, max: number): string => {
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return `${formatTime(min)} - ${formatTime(max)}`;
};

const DeliveryTimeEstimate = ({
  locationType,
  itemCount,
  className,
}: DeliveryTimeEstimateProps) => {
  const estimate = getEstimatedTime(locationType, itemCount);
  const timeRange = formatTimeRange(estimate.min, estimate.max);

  // Complexity indicator
  const complexityLevel =
    itemCount > 10
      ? "Complex order"
      : itemCount > 5
      ? "Moderate order"
      : "Simple order";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
        <Clock className="w-5 h-5 text-secondary-foreground" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">Estimated Delivery</p>
        <p className="text-lg font-semibold text-primary">{timeRange}</p>
        <p className="text-xs text-muted-foreground">
          {complexityLevel} • {itemCount} {itemCount === 1 ? "item" : "items"} •{" "}
          {locationType === "market" ? "Market" : "Mall"} shopping
        </p>
      </div>
    </div>
  );
};

export default DeliveryTimeEstimate;
