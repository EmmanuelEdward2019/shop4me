import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OrderCountdownTimerProps {
  timerStartedAt: string | null;
  estimatedMinutes: number | null;
  orderStatus: string;
  itemCount?: number;
  className?: string;
  compact?: boolean;
}

/** Dynamic timer formula: 15 min base + 5 min per item */
export const calculateEstimatedMinutes = (itemCount: number): number => {
  return Math.max(15, 15 + itemCount * 5);
};

const OrderCountdownTimer = ({
  timerStartedAt,
  estimatedMinutes,
  orderStatus,
  itemCount = 0,
  className,
  compact = false,
}: OrderCountdownTimerProps) => {
  const [now, setNow] = useState(Date.now());

  // Only show timer during active statuses
  const activeStatuses = ["accepted", "shopping", "items_confirmed", "payment_pending", "paid", "in_transit"];
  const isActive = activeStatuses.includes(orderStatus);
  const isDelivered = orderStatus === "delivered";

  useEffect(() => {
    if (!isActive || !timerStartedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isActive, timerStartedAt]);

  const timerData = useMemo(() => {
    if (!timerStartedAt || !estimatedMinutes) return null;

    const startTime = new Date(timerStartedAt).getTime();
    const totalMs = estimatedMinutes * 60 * 1000;
    const elapsedMs = now - startTime;
    const remainingMs = Math.max(0, totalMs - elapsedMs);

    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
    const progress = Math.min(100, (elapsedMs / totalMs) * 100);
    const isOvertime = elapsedMs > totalMs;
    const overtimeMinutes = isOvertime ? Math.floor((elapsedMs - totalMs) / 60000) : 0;

    return {
      remainingMinutes,
      remainingSeconds,
      progress,
      isOvertime,
      overtimeMinutes,
    };
  }, [timerStartedAt, estimatedMinutes, now]);

  if (!timerStartedAt || !estimatedMinutes) return null;
  if (!isActive && !isDelivered) return null;

  // Delivered state — show completion
  if (isDelivered && timerData) {
    const wasOnTime = !timerData.isOvertime;
    return (
      <Card className={cn("border-primary/30", className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Delivered {wasOnTime ? "on time" : `${timerData.overtimeMinutes} min late`}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timerData) return null;

  const { remainingMinutes, remainingSeconds, progress, isOvertime, overtimeMinutes } = timerData;

  // Urgency levels
  const urgency = isOvertime
    ? "overtime"
    : remainingMinutes <= 5
    ? "critical"
    : remainingMinutes <= 15
    ? "warning"
    : "normal";

  const urgencyConfig = {
    normal: {
      bg: "bg-primary/10",
      border: "border-primary/20",
      text: "text-primary",
      progressColor: "bg-primary",
      icon: Clock,
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-600",
      progressColor: "bg-amber-500",
      icon: Clock,
    },
    critical: {
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      text: "text-destructive",
      progressColor: "bg-destructive",
      icon: AlertTriangle,
    },
    overtime: {
      bg: "bg-destructive/15",
      border: "border-destructive/40",
      text: "text-destructive",
      progressColor: "bg-destructive",
      icon: AlertTriangle,
    },
  };

  const config = urgencyConfig[urgency];
  const Icon = config.icon;

  const formatTime = (min: number, sec: number) => {
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold", config.bg, config.text, className)}>
        <Icon className="w-3.5 h-3.5" />
        {isOvertime ? (
          <span>+{overtimeMinutes}min over</span>
        ) : (
          <span>{formatTime(remainingMinutes, remainingSeconds)}</span>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border", config.border, className)}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", config.text)} />
            <span className="text-sm font-medium text-foreground">
              {isOvertime ? "Time Exceeded" : "Estimated Delivery Time"}
            </span>
          </div>
          <div className={cn("font-mono text-lg font-bold", config.text)}>
            {isOvertime ? (
              <span>+{overtimeMinutes}:{String(Math.floor(((Date.now() - new Date(timerStartedAt!).getTime() - estimatedMinutes! * 60000) % 60000) / 1000)).padStart(2, "0")}</span>
            ) : (
              <span>{formatTime(remainingMinutes, remainingSeconds)}</span>
            )}
          </div>
        </div>

        <Progress
          value={Math.min(progress, 100)}
          className={cn("h-2", isOvertime && "[&>div]:bg-destructive")}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{estimatedMinutes} min estimated • {itemCount} items</span>
          <span>{isOvertime ? "OVERTIME" : `${remainingMinutes} min left`}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCountdownTimer;
