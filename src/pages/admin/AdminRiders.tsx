import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Bike, Package, CheckCircle, Clock, MapPin } from "lucide-react";

interface RiderWithStats {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  total_pickups: number;
  completed_pickups: number;
  avg_arrival_minutes: number | null;
  active_pickups: number;
}

const AdminRiders = () => {
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      // Get all riders
      const { data: riderRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (rolesError) throw rolesError;

      if (!riderRoles || riderRoles.length === 0) {
        setRiders([]);
        setLoading(false);
        return;
      }

      const riderIds = riderRoles.map((r) => r.user_id);

      // Fetch profiles and rider alerts in parallel
      const [profilesResult, alertsResult] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", riderIds),
        supabase.from("rider_alerts").select("*").in("rider_id", riderIds),
      ]);

      const profiles = profilesResult.data || [];
      const alerts = alertsResult.data || [];

      const ridersWithStats: RiderWithStats[] = profiles.map((profile) => {
        const riderAlerts = alerts.filter((a) => a.rider_id === profile.user_id);
        const completedAlerts = riderAlerts.filter((a) => a.status === "completed");
        const activeAlerts = riderAlerts.filter((a) => a.status === "accepted");

        // Calculate average time from creation to arrival
        const arrivalTimes = riderAlerts
          .filter((a) => a.rider_arrived_at && a.created_at)
          .map((a) => {
            const created = new Date(a.created_at).getTime();
            const arrived = new Date(a.rider_arrived_at!).getTime();
            return (arrived - created) / 60000; // minutes
          });

        const avgArrival = arrivalTimes.length > 0
          ? Math.round(arrivalTimes.reduce((s, t) => s + t, 0) / arrivalTimes.length)
          : null;

        return {
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          created_at: profile.created_at,
          total_pickups: riderAlerts.length,
          completed_pickups: completedAlerts.length,
          avg_arrival_minutes: avgArrival,
          active_pickups: activeAlerts.length,
        };
      });

      setRiders(ridersWithStats);
    } catch (error) {
      console.error("Error fetching riders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRiders = riders.filter((rider) =>
    rider.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rider.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rider.phone?.includes(searchQuery)
  );

  const totalRiders = riders.length;
  const totalCompleted = riders.reduce((s, r) => s + r.completed_pickups, 0);
  const totalActive = riders.reduce((s, r) => s + r.active_pickups, 0);
  const overallAvg = riders.filter((r) => r.avg_arrival_minutes !== null);
  const avgArrivalAll = overallAvg.length > 0
    ? Math.round(overallAvg.reduce((s, r) => s + (r.avg_arrival_minutes || 0), 0) / overallAvg.length)
    : null;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Rider Management</h1>
          <p className="text-muted-foreground">Monitor rider performance and delivery metrics.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Riders</CardTitle>
              <Bike className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRiders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Pickups</CardTitle>
              <MapPin className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalActive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Arrival</CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {avgArrivalAll !== null ? `${avgArrivalAll}m` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Riders</CardTitle>
            <CardDescription>
              {filteredRiders.length} rider{filteredRiders.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredRiders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No riders found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Total Pickups</TableHead>
                      <TableHead>Avg. Arrival</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRiders.map((rider) => (
                      <TableRow key={rider.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rider.full_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{rider.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{rider.phone || "—"}</TableCell>
                        <TableCell>
                          {rider.active_pickups > 0 ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {rider.active_pickups} active
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {rider.completed_pickups}
                          </span>
                        </TableCell>
                        <TableCell>{rider.total_pickups}</TableCell>
                        <TableCell>
                          {rider.avg_arrival_minutes !== null ? (
                            <span className={rider.avg_arrival_minutes <= 15 ? "text-green-600" : rider.avg_arrival_minutes <= 30 ? "text-orange-600" : "text-red-600"}>
                              {rider.avg_arrival_minutes}m
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{new Date(rider.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminRiders;
