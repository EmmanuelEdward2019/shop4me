import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentRatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

const AgentRatingDisplay = ({
  rating,
  reviewCount = 0,
  size = "md",
  showCount = true,
}: AgentRatingDisplayProps) => {
  const starSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const roundedRating = Math.round(rating * 10) / 10;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fillPercentage = Math.min(Math.max(rating - star + 1, 0), 1) * 100;
          
          return (
            <div key={star} className="relative">
              <Star
                className={cn(starSizes[size], "text-muted-foreground/30")}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star
                  className={cn(starSizes[size], "fill-primary text-primary")}
                />
              </div>
            </div>
          );
        })}
      </div>
      <span className={cn("font-medium text-foreground", textSizes[size])}>
        {roundedRating.toFixed(1)}
      </span>
      {showCount && reviewCount > 0 && (
        <span className={cn("text-muted-foreground", textSizes[size])}>
          ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
};

export default AgentRatingDisplay;
