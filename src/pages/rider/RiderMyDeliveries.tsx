import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderDashboardLayout from "@/components/dashboard/RiderDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, MapPin, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const RiderMyDeliveries = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDeliveries();
  }, [user]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("rider_alerts")
        .select("*")
        .eq("rider_id", user?.id)
        .order("created_at", { ascending: false });

      setDeliveries(data || []);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RiderDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Deliveries</h1>
          <p className="text-muted-foreground">Track all your accepted and completed deliveries.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Deliveries</CardTitle>
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
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Bike className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No deliveries yet</h3>
                <p className="text-muted-foreground">Accept pickups to start delivering.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{d.store_location_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`capitalize ${
                      d.status === "completed" ? "bg-green-100 text-green-800" :
                      d.status === "accepted" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {d.status}
                    </Badge>
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

export default RiderMyDeliveries;
