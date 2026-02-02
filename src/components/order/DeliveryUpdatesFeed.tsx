import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, MessageSquare, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DeliveryUpdate {
  id: string;
  update_type: string;
  message: string | null;
  created_at: string;
}

interface DeliveryUpdatesFeedProps {
  orderId: string;
}

const updateIcons: Record<string, typeof AlertTriangle> = {
  stop: Clock,
  delay: AlertTriangle,
  note: MessageSquare,
  arrived_nearby: MapPin,
};

const updateColors: Record<string, string> = {
  stop: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  delay: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  note: "bg-muted text-muted-foreground border-border",
  arrived_nearby: "bg-primary/10 text-primary border-primary/30",
};

const DeliveryUpdatesFeed = ({ orderId }: DeliveryUpdatesFeedProps) => {
  const [updates, setUpdates] = useState<DeliveryUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      const { data, error } = await supabase
        .from("delivery_updates")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setUpdates(data);
      }
      setLoading(false);
    };

    fetchUpdates();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`delivery-updates-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_updates",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setUpdates((prev) => [payload.new as DeliveryUpdate, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading || updates.length === 0) {
    return null;
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Recent Updates</p>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {updates.map((update) => {
          const Icon = updateIcons[update.update_type] || MessageSquare;
          const colorClass = updateColors[update.update_type] || updateColors.note;

          return (
            <div
              key={update.id}
              className={cn(
                "flex items-start gap-2 p-2 rounded-lg border",
                colorClass
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{update.message}</p>
                <p className="text-xs opacity-70 mt-0.5">
                  {formatTime(update.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveryUpdatesFeed;
