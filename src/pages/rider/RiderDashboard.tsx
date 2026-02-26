import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderDashboardLayout from "@/components/dashboard/RiderDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Bike, CheckCircle, ArrowRight, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const RiderDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ available: 0, active: 0, completed: 0 });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(" ");
        setUserName(parts[parts.length - 1]);
      }

      // Fetch available pickups (pending alerts with no rider assigned)
      const { count: availableCount } = await supabase
        .from("rider_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .is("rider_id", null);

      // Fetch my active deliveries
      const { count: activeCount } = await supabase
        .from("rider_alerts")
        .select("*", { count: "exact", head: true })
        .eq("rider_id", user?.id)
        .eq("status", "accepted");

      // Fetch completed
      const { count: completedCount } = await supabase
        .from("rider_alerts")
        .select("*", { count: "exact", head: true })
        .eq("rider_id", user?.id)
        .eq("status", "completed");

      setStats({
        available: availableCount || 0,
        active: activeCount || 0,
        completed: completedCount || 0,
      });

      // Fetch recent alerts
      const { data: alerts } = await supabase
        .from("rider_alerts")
        .select("*")
        .or(`rider_id.eq.${user?.id},rider_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentAlerts(alerts || []);
    } catch (error) {
      console.error("Error fetching rider dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RiderDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {userName ? `Hey ${userName}!` : "Rider Dashboard"} 🏍️
            </h1>
            <p className="text-muted-foreground">Pick up orders and deliver to customers.</p>
          </div>
          <Button asChild size="lg">
            <Link to="/rider/available-pickups">
              <Bell className="w-5 h-5 mr-2" />
              View Available Pickups
            </Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available Pickups</p>
                      <p className="text-2xl font-bold text-primary">{stats.available}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Deliveries</p>
                      <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Alerts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/rider/available-pickups">
                View all <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Bike className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No pickup alerts yet</p>
                <Button asChild>
                  <Link to="/rider/available-pickups">Check available pickups</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{alert.store_location_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString("en-NG", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.order_packed && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Packed</span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        alert.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        alert.status === "accepted" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {alert.status}
                      </span>
                    </div>
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

export default RiderDashboard;
