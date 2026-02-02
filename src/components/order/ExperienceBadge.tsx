import { Badge } from "@/components/ui/badge";
import { Award, Medal, Shield, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeLevel = "new" | "bronze" | "silver" | "gold" | "platinum";

interface ExperienceBadgeProps {
  completedOrders: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const getBadgeLevel = (completedOrders: number): BadgeLevel => {
  if (completedOrders >= 100) return "platinum";
  if (completedOrders >= 50) return "gold";
  if (completedOrders >= 20) return "silver";
  if (completedOrders >= 5) return "bronze";
  return "new";
};

const badgeConfig: Record<
  BadgeLevel,
  {
    label: string;
    description: string;
    icon: typeof Award;
    className: string;
    iconClassName: string;
  }
> = {
  new: {
    label: "New Agent",
    description: "Just getting started",
    icon: Star,
    className: "bg-muted text-muted-foreground border-muted",
    iconClassName: "text-muted-foreground",
  },
  bronze: {
    label: "Bronze",
    description: "5+ orders completed",
    icon: Shield,
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  silver: {
    label: "Silver",
    description: "20+ orders completed",
    icon: Medal,
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
    iconClassName: "text-slate-500 dark:text-slate-400",
  },
  gold: {
    label: "Gold",
    description: "50+ orders completed",
    icon: Award,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    iconClassName: "text-yellow-600 dark:text-yellow-400",
  },
  platinum: {
    label: "Platinum",
    description: "100+ orders completed",
    icon: Trophy,
    className: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
    iconClassName: "text-violet-600 dark:text-violet-400",
  },
};

const ExperienceBadge = ({
  completedOrders,
  size = "md",
  showLabel = true,
}: ExperienceBadgeProps) => {
  const level = getBadgeLevel(completedOrders);
  const config = badgeConfig[level];
  const Icon = config.icon;

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const badgePadding = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-sm",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1 border",
        config.className,
        badgePadding[size]
      )}
      title={config.description}
    >
      <Icon className={cn(iconSizes[size], config.iconClassName)} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
};

export { ExperienceBadge, getBadgeLevel, badgeConfig };
