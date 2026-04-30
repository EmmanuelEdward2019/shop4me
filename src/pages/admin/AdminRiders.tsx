import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Bike, Package, CheckCircle, Clock, MapPin, Wallet, Loader2 } from "lucide-react";

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

interface WithdrawalRequest {
  id: string;
  rider_id: string;
  amount: number;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  status: string;
  requested_at: string;
  transferred_at: string | null;
  rider_name?: string;
  rider_email?: string;
  rider_phone?: string;
}

const fmt = (n: number) => "₦" + new Intl.NumberFormat("en-NG").format(Math.round(n));

const AdminRiders = () => {
  const { toast } = useToast();
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRiders();
    fetchWithdrawals();
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

  const fetchWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const { data: wData, error } = await supabase
        .from("rider_withdrawals" as any)
        .select("*")
        .in("status", ["pending", "transferred"])
        .order("requested_at", { ascending: false });
      if (error) throw error;

      const rows = (wData ?? []) as any[];
      if (rows.length === 0) { setWithdrawals([]); return; }

      const riderIds = [...new Set(rows.map((r: any) => r.rider_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", riderIds);

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      setWithdrawals(rows.map((r: any) => ({
        id: r.id,
        rider_id: r.rider_id,
        amount: Number(r.amount),
        bank_name: r.bank_name,
        account_name: r.account_name,
        account_number: r.account_number,
        status: r.status,
        requested_at: r.requested_at,
        transferred_at: r.transferred_at,
        rider_name: profileMap[r.rider_id]?.full_name ?? "—",
        rider_email: profileMap[r.rider_id]?.email ?? "—",
        rider_phone: profileMap[r.rider_id]?.phone ?? "—",
      })));
    } catch (err) {
      console.error("Error fetching withdrawals:", err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const markAsTransferred = async (withdrawalId: string) => {
    setMarkingId(withdrawalId);
    try {
      const { error } = await supabase
        .from("rider_withdrawals" as any)
        .update({ status: "transferred", transferred_at: new Date().toISOString() } as any)
        .eq("id", withdrawalId);
      if (error) throw error;
      toast({ title: "Marked as Transferred", description: "Rider will now see a confirmation prompt." });
      fetchWithdrawals();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to update", variant: "destructive" });
    } finally {
      setMarkingId(null);
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

  const pendingWithdrawalCount = withdrawals.filter((w) => w.status === "pending").length;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Rider Management</h1>
          <p className="text-muted-foreground">Monitor rider performance and manage withdrawal requests.</p>
        </div>

        <Tabs defaultValue="riders">
          <TabsList>
            <TabsTrigger value="riders">All Riders</TabsTrigger>
            <TabsTrigger value="withdrawals" className="relative">
              Withdrawal Requests
              {pendingWithdrawalCount > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pendingWithdrawalCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="riders" className="space-y-6 mt-4">
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
          </TabsContent>

          {/* ── Withdrawals Tab ── */}
          <TabsContent value="withdrawals" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" /> Rider Withdrawal Requests
                </CardTitle>
                <CardDescription>
                  Transfer funds manually to the rider's bank account, then mark as transferred. Rider confirms receipt to complete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending withdrawal requests.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rider</TableHead>
                          <TableHead>Bank Details</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>
                              <p className="font-medium">{w.rider_name}</p>
                              <p className="text-xs text-muted-foreground">{w.rider_email}</p>
                              <p className="text-xs text-muted-foreground">{w.rider_phone}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{w.bank_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{w.account_number}</p>
                              <p className="text-xs text-muted-foreground">{w.account_name}</p>
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {fmt(w.amount)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(w.requested_at).toLocaleString("en-NG", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              {w.status === "pending" ? (
                                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Awaiting Transfer</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Transferred — Awaiting Confirmation</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {w.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => markAsTransferred(w.id)}
                                  disabled={markingId === w.id}
                                >
                                  {markingId === w.id && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                                  Mark Transferred
                                </Button>
                              )}
                              {w.status === "transferred" && (
                                <span className="text-sm text-muted-foreground italic">Waiting for rider</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminRiders;
