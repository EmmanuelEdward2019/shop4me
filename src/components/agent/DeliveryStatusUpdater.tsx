import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Clock,
  Coffee,
  Fuel,
  MessageSquare,
  Navigation,
  Send,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/lib/native";

interface DeliveryStatusUpdaterProps {
  orderId: string;
  agentId: string;
  orderStatus: string;
}

type UpdateType = "stop" | "delay" | "note";

interface QuickUpdate {
  type: UpdateType;
  icon: typeof AlertTriangle;
  label: string;
  message: string;
  color: string;
}

const quickUpdates: QuickUpdate[] = [
  {
    type: "delay",
    icon: AlertTriangle,
    label: "Traffic",
    message: "Stuck in traffic, will arrive a bit later",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  {
    type: "stop",
    icon: Fuel,
    label: "Fuel Stop",
    message: "Quick fuel stop",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  {
    type: "stop",
    icon: Coffee,
    label: "Short Break",
    message: "Taking a short break",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  },
  {
    type: "delay",
    icon: Clock,
    label: "Wait Time",
    message: "Waiting at pickup location",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
];

const DeliveryStatusUpdater = ({
  orderId,
  agentId,
  orderStatus,
}: DeliveryStatusUpdaterProps) => {
  const { toast } = useToast();
  const { impact, notification } = useHaptics();
  const [showCustom, setShowCustom] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const isActive = orderStatus === "in_transit";

  if (!isActive) {
    return null;
  }

  const sendUpdate = async (type: UpdateType, message: string) => {
    setSending(true);
    try {
      // Get current location if available
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
              });
            }
          );
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (e) {
          // Location not available, continue without it
        }
      }

      const { error } = await supabase.from("delivery_updates").insert({
        order_id: orderId,
        agent_id: agentId,
        update_type: type,
        message,
        latitude,
        longitude,
      });

      if (error) throw error;

      toast({
        title: "Update Sent",
        description: "Customer has been notified of your status",
      });

      setCustomMessage("");
      setShowCustom(false);
    } catch (error) {
      console.error("Error sending update:", error);
      toast({
        title: "Error",
        description: "Failed to send update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Delivery Updates
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            In Transit
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Let the customer know about any stops or delays
        </p>

        {/* Quick updates */}
        <div className="grid grid-cols-2 gap-2">
          {quickUpdates.map((update, index) => {
            const Icon = update.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className={cn(
                  "h-auto py-3 flex flex-col items-center gap-1.5 border-2",
                  update.color
                )}
                onClick={() => sendUpdate(update.type, update.message)}
                disabled={sending}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{update.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Custom message */}
        {showCustom ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custom Message</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustom(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Type your update message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button
              className="w-full"
              onClick={() => sendUpdate("note", customMessage)}
              disabled={sending || !customMessage.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Update
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCustom(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Custom Message
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryStatusUpdater;
