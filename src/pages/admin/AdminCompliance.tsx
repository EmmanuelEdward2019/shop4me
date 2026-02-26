import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Bike,
  UserCheck,
  MapPin,
  Timer,
  CheckCircle,
  XCircle,
  Activity,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────
interface AgentCompliance {
  user_id: string;
  full_name: string | null;
  email: string;
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  avg_fulfillment_minutes: number | null;
  overtime_count: number;
  on_time_rate: number;
  avg_response_minutes: number | null;
  compliance_score: number;
}

interface RiderCompliance {
  user_id: string;
  full_name: string | null;
  email: string;
  total_pickups: number;
  completed_pickups: number;
  avg_arrival_minutes: number | null;
  avg_pickup_minutes: number | null;
  gps_verified_count: number;
  gps_verification_rate: number;
  no_show_count: number;
  compliance_score: number;
}

interface OrderFlag {
  id: string;
  location_name: string;
  status: string;
  created_at: string;
  agent_name: string | null;
  rider_name: string | null;
  flag_type: string;
  flag_detail: string;
  severity: "low" | "medium" | "high";
}

// ── Helpers ────────────────────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-orange-500";
  return "text-destructive";
};

const getScoreBg = (score: number) => {
  if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 70) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
};

const getSeverityBadge = (severity: string) => {
  if (severity === "high") return "bg-red-100 text-red-800 border-red-200";
  if (severity === "medium") return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-yellow-100 text-yellow-800 border-yellow-200";
};

// ── Main Component ─────────────────────────────────────
const AdminCompliance = () => {
  const [agentData, setAgentData] = useState<AgentCompliance[]>([]);
  const [riderData, setRiderData] = useState<RiderCompliance[]>([]);
  const [flags, setFlags] = useState<OrderFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      // Parallel fetch: agents, riders, orders, rider_alerts, profiles
      const [
        agentRolesRes,
        riderRolesRes,
        ordersRes,
        alertsRes,
        profilesRes,
      ] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "agent"),
        supabase.from("user_roles").select("user_id").eq("role", "rider"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("rider_alerts").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, email"),
      ]);

      const profiles = profilesRes.data || [];
      const orders = ordersRes.data || [];
      const alerts = alertsRes.data || [];
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // ── Agent Compliance ──
      const agentIds = (agentRolesRes.data || []).map(r => r.user_id);
      const agentCompliance: AgentCompliance[] = agentIds.map(agentId => {
        const profile = profileMap.get(agentId);
        const agentOrders = orders.filter(o => o.agent_id === agentId);
        const delivered = agentOrders.filter(o => o.status === "delivered");
        const cancelled = agentOrders.filter(o => o.status === "cancelled");

        // Fulfillment time: from timer_started_at to updated_at for delivered orders
        const fulfillmentTimes = delivered
          .filter(o => o.timer_started_at)
          .map(o => {
            const start = new Date(o.timer_started_at!).getTime();
            const end = new Date(o.updated_at).getTime();
            return (end - start) / 60000;
          });

        const avgFulfillment = fulfillmentTimes.length > 0
          ? Math.round(fulfillmentTimes.reduce((s, t) => s + t, 0) / fulfillmentTimes.length)
          : null;

        // Overtime: orders that took longer than estimated_minutes
        const overtimeCount = delivered.filter(o => {
          if (!o.timer_started_at || !o.estimated_minutes) return false;
          const start = new Date(o.timer_started_at).getTime();
          const end = new Date(o.updated_at).getTime();
          const actualMinutes = (end - start) / 60000;
          return actualMinutes > o.estimated_minutes;
        }).length;

        const onTimeRate = delivered.length > 0
          ? Math.round(((delivered.length - overtimeCount) / delivered.length) * 100)
          : 100;

        // Response time: from created_at to when agent accepted (status changed from pending)
        const acceptedOrders = agentOrders.filter(o => o.agent_id === agentId && o.timer_started_at);
        const responseTimes = acceptedOrders
          .map(o => {
            const created = new Date(o.created_at).getTime();
            const accepted = new Date(o.timer_started_at!).getTime();
            return (accepted - created) / 60000;
          })
          .filter(t => t > 0 && t < 1440); // filter unreasonable values

        const avgResponse = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length)
          : null;

        // Compliance score: weighted formula
        const deliveryRate = agentOrders.length > 0 ? (delivered.length / agentOrders.length) * 100 : 100;
        const score = Math.round(
          (onTimeRate * 0.4) +
          (deliveryRate * 0.3) +
          (Math.min(100, avgResponse !== null ? Math.max(0, 100 - avgResponse * 2) : 100) * 0.3)
        );

        return {
          user_id: agentId,
          full_name: profile?.full_name || null,
          email: profile?.email || "Unknown",
          total_orders: agentOrders.length,
          delivered_orders: delivered.length,
          cancelled_orders: cancelled.length,
          avg_fulfillment_minutes: avgFulfillment,
          overtime_count: overtimeCount,
          on_time_rate: onTimeRate,
          avg_response_minutes: avgResponse,
          compliance_score: score,
        };
      }).sort((a, b) => a.compliance_score - b.compliance_score);

      setAgentData(agentCompliance);

      // ── Rider Compliance ──
      const riderIds = (riderRolesRes.data || []).map(r => r.user_id);
      const riderCompliance: RiderCompliance[] = riderIds.map(riderId => {
        const profile = profileMap.get(riderId);
        const riderAlerts = alerts.filter(a => a.rider_id === riderId);
        const completed = riderAlerts.filter(a => a.status === "completed");

        // Arrival time: accepted to arrived
        const arrivalTimes = riderAlerts
          .filter(a => a.rider_arrived_at && a.created_at)
          .map(a => {
            const created = new Date(a.created_at).getTime();
            const arrived = new Date(a.rider_arrived_at!).getTime();
            return (arrived - created) / 60000;
          });

        const avgArrival = arrivalTimes.length > 0
          ? Math.round(arrivalTimes.reduce((s, t) => s + t, 0) / arrivalTimes.length)
          : null;

        // Pickup time: arrived to picked up
        const pickupTimes = riderAlerts
          .filter(a => a.rider_arrived_at && a.order_picked_up_at)
          .map(a => {
            const arrived = new Date(a.rider_arrived_at!).getTime();
            const picked = new Date(a.order_picked_up_at!).getTime();
            return (picked - arrived) / 60000;
          });

        const avgPickup = pickupTimes.length > 0
          ? Math.round(pickupTimes.reduce((s, t) => s + t, 0) / pickupTimes.length)
          : null;

        // GPS verification: alerts where store coordinates exist and rider arrived
        const gpsVerified = riderAlerts.filter(a =>
          a.store_latitude && a.store_longitude && a.rider_arrived_at
        ).length;

        const gpsRate = riderAlerts.length > 0
          ? Math.round((gpsVerified / riderAlerts.length) * 100)
          : 0;

        // No-shows: accepted but never arrived (older than 2 hours)
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const noShows = riderAlerts.filter(a =>
          a.status === "accepted" && !a.rider_arrived_at && new Date(a.created_at).getTime() < twoHoursAgo
        ).length;

        // Score
        const completionRate = riderAlerts.length > 0 ? (completed.length / riderAlerts.length) * 100 : 100;
        const arrivalScore = avgArrival !== null ? Math.max(0, 100 - avgArrival * 2) : 100;
        const score = Math.round(
          (completionRate * 0.3) +
          (gpsRate * 0.3) +
          (Math.min(100, arrivalScore) * 0.2) +
          (Math.max(0, 100 - noShows * 20) * 0.2)
        );

        return {
          user_id: riderId,
          full_name: profile?.full_name || null,
          email: profile?.email || "Unknown",
          total_pickups: riderAlerts.length,
          completed_pickups: completed.length,
          avg_arrival_minutes: avgArrival,
          avg_pickup_minutes: avgPickup,
          gps_verified_count: gpsVerified,
          gps_verification_rate: gpsRate,
          no_show_count: noShows,
          compliance_score: score,
        };
      }).sort((a, b) => a.compliance_score - b.compliance_score);

      setRiderData(riderCompliance);

      // ── Flags ──
      const orderFlags: OrderFlag[] = [];

      // Flag: orders stuck too long in non-terminal statuses
      const activeStatuses = ["pending", "accepted", "shopping", "items_confirmed", "payment_pending", "in_transit"];
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

      orders.forEach(order => {
        if (activeStatuses.includes(order.status)) {
          const age = Date.now() - new Date(order.created_at).getTime();
          const agentProfile = profileMap.get(order.agent_id || "");

          if (age > 4 * 60 * 60 * 1000) {
            orderFlags.push({
              id: order.id,
              location_name: order.location_name,
              status: order.status,
              created_at: order.created_at,
              agent_name: agentProfile?.full_name || null,
              rider_name: null,
              flag_type: "Stale Order",
              flag_detail: `Order stuck in "${order.status}" for ${Math.round(age / 3600000)}h`,
              severity: "high",
            });
          } else if (age > 60 * 60 * 1000 && order.status === "pending") {
            orderFlags.push({
              id: order.id,
              location_name: order.location_name,
              status: order.status,
              created_at: order.created_at,
              agent_name: null,
              rider_name: null,
              flag_type: "Unaccepted Order",
              flag_detail: `Pending for ${Math.round(age / 60000)}m — no agent accepted`,
              severity: "medium",
            });
          }
        }

        // Flag: overtime deliveries
        if (order.status === "delivered" && order.timer_started_at && order.estimated_minutes) {
          const start = new Date(order.timer_started_at).getTime();
          const end = new Date(order.updated_at).getTime();
          const actual = (end - start) / 60000;
          if (actual > order.estimated_minutes * 1.5) {
            const agentProfile = profileMap.get(order.agent_id || "");
            orderFlags.push({
              id: order.id,
              location_name: order.location_name,
              status: order.status,
              created_at: order.created_at,
              agent_name: agentProfile?.full_name || null,
              rider_name: null,
              flag_type: "Severe Overtime",
              flag_detail: `Took ${Math.round(actual)}m vs ${order.estimated_minutes}m estimate (${Math.round((actual / order.estimated_minutes) * 100)}%)`,
              severity: "high",
            });
          }
        }
      });

      // Flag: rider no-shows
      alerts.forEach(alert => {
        if (alert.status === "accepted" && !alert.rider_arrived_at && alert.rider_id) {
          const age = Date.now() - new Date(alert.created_at).getTime();
          if (age > 60 * 60 * 1000) {
            const riderProfile = profileMap.get(alert.rider_id);
            orderFlags.push({
              id: alert.id,
              location_name: alert.store_location_name,
              status: "rider_no_show",
              created_at: alert.created_at,
              agent_name: null,
              rider_name: riderProfile?.full_name || null,
              flag_type: "Rider No-Show",
              flag_detail: `Accepted ${Math.round(age / 60000)}m ago, never arrived`,
              severity: "high",
            });
          }
        }

        // Flag: missing GPS verification
        if (alert.rider_arrived_at && (!alert.store_latitude || !alert.store_longitude)) {
          const riderProfile = profileMap.get(alert.rider_id || "");
          orderFlags.push({
            id: alert.id,
            location_name: alert.store_location_name,
            status: "no_gps",
            created_at: alert.created_at,
            agent_name: null,
            rider_name: riderProfile?.full_name || null,
            flag_type: "No GPS Verification",
            flag_detail: "Rider marked arrived without GPS coordinates on file",
            severity: "low",
          });
        }
      });

      // Sort flags by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      orderFlags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      setFlags(orderFlags);

    } catch (error) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Summary Stats ──
  const totalAgents = agentData.length;
  const avgAgentScore = totalAgents > 0
    ? Math.round(agentData.reduce((s, a) => s + a.compliance_score, 0) / totalAgents)
    : 0;
  const totalRiders = riderData.length;
  const avgRiderScore = totalRiders > 0
    ? Math.round(riderData.reduce((s, r) => s + r.compliance_score, 0) / totalRiders)
    : 0;
  const highFlags = flags.filter(f => f.severity === "high").length;
  const lowPerformers = [...agentData, ...riderData].filter(u => u.compliance_score < 70).length;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Compliance & Monitoring
          </h1>
          <p className="text-muted-foreground">
            Track agent and rider efficiency, response times, GPS verification, and compliance flags.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Agent Score</CardTitle>
              <UserCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(avgAgentScore)}`}>
                {loading ? "—" : `${avgAgentScore}%`}
              </div>
              <Progress value={avgAgentScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rider Score</CardTitle>
              <Bike className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(avgRiderScore)}`}>
                {loading ? "—" : `${avgRiderScore}%`}
              </div>
              <Progress value={avgRiderScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Flags</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? "—" : highFlags}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{flags.length} total issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Performers</CardTitle>
              <Activity className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {loading ? "—" : lowPerformers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Score below 70%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="flags" className="space-y-4">
          <TabsList>
            <TabsTrigger value="flags" className="gap-1">
              <AlertTriangle className="w-4 h-4" />
              Flags ({flags.length})
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1">
              <UserCheck className="w-4 h-4" />
              Agents ({agentData.length})
            </TabsTrigger>
            <TabsTrigger value="riders" className="gap-1">
              <Bike className="w-4 h-4" />
              Riders ({riderData.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Flags Tab ── */}
          <TabsContent value="flags">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Flags</CardTitle>
                <CardDescription>
                  Issues requiring attention — stale orders, overtime, no-shows, missing GPS
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : flags.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">All Clear</p>
                    <p className="text-muted-foreground">No compliance issues detected.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Flag</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Person</TableHead>
                          <TableHead>Detail</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flags.map((flag, i) => (
                          <TableRow key={`${flag.id}-${i}`}>
                            <TableCell>
                              <Badge variant="outline" className={getSeverityBadge(flag.severity)}>
                                {flag.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{flag.flag_type}</TableCell>
                            <TableCell>{flag.location_name}</TableCell>
                            <TableCell>{flag.agent_name || flag.rider_name || "—"}</TableCell>
                            <TableCell className="max-w-xs text-sm text-muted-foreground">{flag.flag_detail}</TableCell>
                            <TableCell className="text-sm">{new Date(flag.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Agent Compliance Tab ── */}
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Agent Efficiency & Compliance</CardTitle>
                <CardDescription>
                  Response times, on-time rates, overtime frequency, and composite scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : agentData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No agents to display</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Timer className="w-3 h-3" /> Avg Response
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Avg Fulfillment
                            </div>
                          </TableHead>
                          <TableHead>On-Time</TableHead>
                          <TableHead>Overtime</TableHead>
                          <TableHead>Cancelled</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentData.map((agent) => (
                          <TableRow key={agent.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{agent.full_name || "No name"}</p>
                                <p className="text-xs text-muted-foreground">{agent.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{agent.delivered_orders}</span>
                              <span className="text-muted-foreground">/{agent.total_orders}</span>
                            </TableCell>
                            <TableCell>
                              {agent.avg_response_minutes !== null ? (
                                <span className={agent.avg_response_minutes <= 10 ? "text-green-600" : agent.avg_response_minutes <= 30 ? "text-orange-500" : "text-destructive"}>
                                  {agent.avg_response_minutes}m
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {agent.avg_fulfillment_minutes !== null ? (
                                <span className={agent.avg_fulfillment_minutes <= 30 ? "text-green-600" : agent.avg_fulfillment_minutes <= 60 ? "text-orange-500" : "text-destructive"}>
                                  {agent.avg_fulfillment_minutes}m
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={agent.on_time_rate} className="w-16 h-2" />
                                <span className="text-sm">{agent.on_time_rate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {agent.overtime_count > 0 ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  {agent.overtime_count}
                                </Badge>
                              ) : (
                                <span className="text-green-600">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {agent.cancelled_orders > 0 ? (
                                <span className="text-destructive font-medium">{agent.cancelled_orders}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getScoreBg(agent.compliance_score)}>
                                {agent.compliance_score}%
                              </Badge>
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

          {/* ── Rider Compliance Tab ── */}
          <TabsContent value="riders">
            <Card>
              <CardHeader>
                <CardTitle>Rider Efficiency & Compliance</CardTitle>
                <CardDescription>
                  Arrival times, GPS verification rates, no-shows, and composite scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : riderData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No riders to display</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rider</TableHead>
                          <TableHead>Pickups</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Avg Arrival
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Timer className="w-3 h-3" /> Avg Pickup
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> GPS Verified
                            </div>
                          </TableHead>
                          <TableHead>No-Shows</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riderData.map((rider) => (
                          <TableRow key={rider.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{rider.full_name || "No name"}</p>
                                <p className="text-xs text-muted-foreground">{rider.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{rider.completed_pickups}</span>
                              <span className="text-muted-foreground">/{rider.total_pickups}</span>
                            </TableCell>
                            <TableCell>
                              {rider.avg_arrival_minutes !== null ? (
                                <span className={rider.avg_arrival_minutes <= 15 ? "text-green-600" : rider.avg_arrival_minutes <= 30 ? "text-orange-500" : "text-destructive"}>
                                  {rider.avg_arrival_minutes}m
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {rider.avg_pickup_minutes !== null ? (
                                <span className={rider.avg_pickup_minutes <= 10 ? "text-green-600" : rider.avg_pickup_minutes <= 20 ? "text-orange-500" : "text-destructive"}>
                                  {rider.avg_pickup_minutes}m
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={rider.gps_verification_rate} className="w-16 h-2" />
                                <span className="text-sm">{rider.gps_verification_rate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rider.no_show_count > 0 ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {rider.no_show_count}
                                </Badge>
                              ) : (
                                <span className="text-green-600">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getScoreBg(rider.compliance_score)}>
                                {rider.compliance_score}%
                              </Badge>
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

export default AdminCompliance;
