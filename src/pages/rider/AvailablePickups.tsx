import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHaptics } from "@/lib/native";
import { useAuth } from "@/contexts/AuthContext";
import RiderDashboardLayout from "@/components/dashboard/RiderDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, CheckCircle, Bike, Navigation, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRiderGeofence, formatDistance } from "@/hooks/useRiderGeofence";
import GeofenceStatus from "@/components/rider/GeofenceStatus";

interface RiderAlert {
  id: string;
  order_id: string;
  agent_id: string;
  store_location_name: string;
  status: string;
  order_packed: boolean;
  created_at: string;
  rider_id: string | null;
  store_latitude: number | null;
  store_longitude: number | null;
  rider_arrived_at: string | null;
  order_picked_up_at: string | null;
}

// Geofenced delivery card for accepted pickups
const ActiveDeliveryCard = ({ delivery, onArrived, onPickedUp, onCompleted }: {
  delivery: RiderAlert;
  onArrived: (id: string) => void;
  onPickedUp: (id: string) => void;
  onCompleted: (id: string) => void;
}) => {
  const { distance, formattedDistance, isWithinRadius, loading, error } = useRiderGeofence({
    storeLat: delivery.store_latitude,
    storeLng: delivery.store_longitude,
    radiusMeters: 100,
    watchEnabled: !delivery.order_picked_up_at, // Stop watching after pickup
  });

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const hasArrived = !!delivery.rider_arrived_at;
  const hasPickedUp = !!delivery.order_picked_up_at;

  return (
    <div className="p-4 border border-border rounded-lg bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">{delivery.store_location_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{timeSince(delivery.created_at)}</span>
              {delivery.order_packed && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" /> Order Packed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Geofence Status */}
      {!hasPickedUp && (
        <GeofenceStatus
          distance={distance}
          formattedDistance={formattedDistance}
          isWithinRadius={isWithinRadius}
          loading={loading}
          error={error}
          radiusMeters={100}
        />
      )}

      {/* Action Buttons - Geofenced */}
      <div className="flex flex-wrap gap-2">
        {!hasArrived && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onArrived(delivery.id)}
            disabled={!isWithinRadius}
            className={isWithinRadius ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground" : ""}
          >
            <Navigation className="w-4 h-4 mr-1" />
            {isWithinRadius ? "Mark Arrived at Store" : `Arrive at Store (${formattedDistance || "..."} away)`}
          </Button>
        )}

        {hasArrived && !hasPickedUp && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPickedUp(delivery.id)}
            disabled={!isWithinRadius}
            className={isWithinRadius ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground" : ""}
          >
            <Package className="w-4 h-4 mr-1" />
            {isWithinRadius ? "Order Picked Up" : `Pick Up (${formattedDistance || "..."} away)`}
          </Button>
        )}

        {hasArrived && (
          <Badge variant="outline" className="h-8 flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
            <ShieldCheck className="w-3 h-3" />
            Arrived ✓
          </Badge>
        )}

        {hasPickedUp && (
          <>
            <Badge variant="outline" className="h-8 flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
              <Package className="w-3 h-3" />
              Picked Up ✓
            </Badge>
            <Button size="sm" onClick={() => onCompleted(delivery.id)}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark Delivered
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const AvailablePickups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<RiderAlert[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<RiderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("rider-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_alerts" }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data: available } = await supabase
        .from("rider_alerts")
        .select("*")
        .eq("status", "pending")
        .is("rider_id", null)
        .order("created_at", { ascending: false });

      setAlerts(available || []);

      const { data: mine } = await supabase
        .from("rider_alerts")
        .select("*")
        .eq("rider_id", user?.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      setMyDeliveries(mine || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const acceptPickup = async (alertId: string) => {
    setAccepting(alertId);
    try {
      const { error } = await supabase
        .from("rider_alerts")
        .update({ rider_id: user?.id, status: "accepted" })
        .eq("id", alertId)
        .is("rider_id", null);

      if (error) throw error;
      toast({ title: "Pickup Accepted!", description: "Head to the store. You must be within 100m to mark arrival." });
      fetchAlerts();
    } catch (error) {
      toast({ title: "Error", description: "Failed to accept pickup. It may have been taken.", variant: "destructive" });
    } finally {
      setAccepting(null);
    }
  };

  const markArrived = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("rider_alerts")
        .update({ rider_arrived_at: new Date().toISOString() })
        .eq("id", alertId)
        .eq("rider_id", user?.id);

      if (error) throw error;
      toast({ title: "Arrived!", description: "You've confirmed arrival at the store." });
      fetchAlerts();
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark arrival", variant: "destructive" });
    }
  };

  const markPickedUp = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("rider_alerts")
        .update({ order_picked_up_at: new Date().toISOString() })
        .eq("id", alertId)
        .eq("rider_id", user?.id);

      if (error) throw error;
      toast({ title: "Order Picked Up!", description: "Now deliver to the customer." });
      fetchAlerts();
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark pickup", variant: "destructive" });
    }
  };

  const markCompleted = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("rider_alerts")
        .update({ status: "completed" })
        .eq("id", alertId)
        .eq("rider_id", user?.id);

      if (error) throw error;
      toast({ title: "Delivery Complete!", description: "Great job!" });
      fetchAlerts();
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark as complete", variant: "destructive" });
    }
  };

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <RiderDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Available Pickups</h1>
          <p className="text-muted-foreground">Accept pickup requests from shopping agents. GPS verification required within 100m of store.</p>
        </div>

        {/* My Active Deliveries with Geofencing */}
        {myDeliveries.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bike className="w-5 h-5 text-primary" />
                My Active Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myDeliveries.map((delivery) => (
                <ActiveDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onArrived={markArrived}
                  onPickedUp={markPickedUp}
                  onCompleted={markCompleted}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Available Pickups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pending Pickups ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pickups available</h3>
                <p className="text-muted-foreground">New alerts will appear here when agents request riders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{alert.store_location_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{timeSince(alert.created_at)}</span>
                          {alert.order_packed && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Ready for pickup
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => acceptPickup(alert.id)}
                      disabled={accepting === alert.id}
                    >
                      {accepting === alert.id ? "Accepting..." : "Accept Pickup"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RiderDashboardLayout>
  );
};

export default AvailablePickups;
