import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Bike,
  UserCheck,
  MapPin,
  Timer,
  CheckCircle,
  XCircle,
  Activity,
  Ban,
  MessageSquare,
  RotateCcw,
  History,
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
  is_suspended: boolean;
  warning_count: number;
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
  is_suspended: boolean;
  warning_count: number;
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

interface ComplianceAction {
  id: string;
  target_user_id: string;
  action_type: string;
  reason: string;
  notes: string | null;
  target_role: string;
  compliance_score: number | null;
  created_at: string;
  target_name?: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [agentData, setAgentData] = useState<AgentCompliance[]>([]);
  const [riderData, setRiderData] = useState<RiderCompliance[]>([]);
  const [flags, setFlags] = useState<OrderFlag[]>([]);
  const [actionHistory, setActionHistory] = useState<ComplianceAction[]>([]);
  const [loading, setLoading] = useState(true);

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; role: "agent" | "rider"; score: number } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const [
        agentRolesRes,
        riderRolesRes,
        ordersRes,
        alertsRes,
        profilesRes,
        actionsRes,
        applicationsRes,
      ] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "agent"),
        supabase.from("user_roles").select("user_id").eq("role", "rider"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("rider_alerts").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, email"),
        supabase.from("compliance_actions").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("agent_applications").select("user_id, status"),
      ]);

      const profiles = profilesRes.data || [];
      const orders = ordersRes.data || [];
      const alerts = alertsRes.data || [];
      const actions = actionsRes.data || [];
      const applications = applicationsRes.data || [];
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // Build suspended set from applications
      const suspendedSet = new Set(
        applications.filter(a => a.status === "suspended").map(a => a.user_id)
      );

      // Build warning counts from actions
      const warningCounts = new Map<string, number>();
      actions.forEach(a => {
        if (a.action_type === "warning") {
          warningCounts.set(a.target_user_id, (warningCounts.get(a.target_user_id) || 0) + 1);
        }
      });

      // ── Agent Compliance ──
      const agentIds = (agentRolesRes.data || []).map(r => r.user_id);
      const agentCompliance: AgentCompliance[] = agentIds.map(agentId => {
        const profile = profileMap.get(agentId);
        const agentOrders = orders.filter(o => o.agent_id === agentId);
        const delivered = agentOrders.filter(o => o.status === "delivered");
        const cancelled = agentOrders.filter(o => o.status === "cancelled");

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

        const overtimeCount = delivered.filter(o => {
          if (!o.timer_started_at || !o.estimated_minutes) return false;
          const start = new Date(o.timer_started_at).getTime();
          const end = new Date(o.updated_at).getTime();
          return (end - start) / 60000 > o.estimated_minutes;
        }).length;

        const onTimeRate = delivered.length > 0
          ? Math.round(((delivered.length - overtimeCount) / delivered.length) * 100)
          : 100;

        const acceptedOrders = agentOrders.filter(o => o.agent_id === agentId && o.timer_started_at);
        const responseTimes = acceptedOrders
          .map(o => {
            const created = new Date(o.created_at).getTime();
            const accepted = new Date(o.timer_started_at!).getTime();
            return (accepted - created) / 60000;
          })
          .filter(t => t > 0 && t < 1440);

        const avgResponse = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length)
          : null;

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
          is_suspended: suspendedSet.has(agentId),
          warning_count: warningCounts.get(agentId) || 0,
        };
      }).sort((a, b) => a.compliance_score - b.compliance_score);

      setAgentData(agentCompliance);

      // ── Rider Compliance ──
      const riderIds = (riderRolesRes.data || []).map(r => r.user_id);
      const riderCompliance: RiderCompliance[] = riderIds.map(riderId => {
        const profile = profileMap.get(riderId);
        const riderAlerts = alerts.filter(a => a.rider_id === riderId);
        const completed = riderAlerts.filter(a => a.status === "completed");

        const arrivalTimes = riderAlerts
          .filter(a => a.rider_arrived_at && a.created_at)
          .map(a => (new Date(a.rider_arrived_at!).getTime() - new Date(a.created_at).getTime()) / 60000);

        const avgArrival = arrivalTimes.length > 0
          ? Math.round(arrivalTimes.reduce((s, t) => s + t, 0) / arrivalTimes.length)
          : null;

        const pickupTimes = riderAlerts
          .filter(a => a.rider_arrived_at && a.order_picked_up_at)
          .map(a => (new Date(a.order_picked_up_at!).getTime() - new Date(a.rider_arrived_at!).getTime()) / 60000);

        const avgPickup = pickupTimes.length > 0
          ? Math.round(pickupTimes.reduce((s, t) => s + t, 0) / pickupTimes.length)
          : null;

        const gpsVerified = riderAlerts.filter(a =>
          a.store_latitude && a.store_longitude && a.rider_arrived_at
        ).length;

        const gpsRate = riderAlerts.length > 0 ? Math.round((gpsVerified / riderAlerts.length) * 100) : 0;

        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const noShows = riderAlerts.filter(a =>
          a.status === "accepted" && !a.rider_arrived_at && new Date(a.created_at).getTime() < twoHoursAgo
        ).length;

        const completionRate = riderAlerts.length > 0 ? (completed.length / riderAlerts.length) * 100 : 100;
        const arrivalScore = avgArrival !== null ? Math.max(0, 100 - avgArrival * 2) : 100;
        const score = Math.round(
          (completionRate * 0.3) + (gpsRate * 0.3) + (Math.min(100, arrivalScore) * 0.2) + (Math.max(0, 100 - noShows * 20) * 0.2)
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
          is_suspended: suspendedSet.has(riderId),
          warning_count: warningCounts.get(riderId) || 0,
        };
      }).sort((a, b) => a.compliance_score - b.compliance_score);

      setRiderData(riderCompliance);

      // ── Action History ──
      const historyWithNames: ComplianceAction[] = actions.map(a => ({
        ...a,
        target_name: profileMap.get(a.target_user_id)?.full_name || profileMap.get(a.target_user_id)?.email || "Unknown",
      }));
      setActionHistory(historyWithNames);

      // ── Flags ──
      const orderFlags: OrderFlag[] = [];
      const activeStatuses = ["pending", "accepted", "shopping", "items_confirmed", "payment_pending", "in_transit"];

      orders.forEach(order => {
        if (activeStatuses.includes(order.status)) {
          const age = Date.now() - new Date(order.created_at).getTime();
          const agentProfile = profileMap.get(order.agent_id || "");

          if (age > 4 * 60 * 60 * 1000) {
            orderFlags.push({
              id: order.id, location_name: order.location_name, status: order.status,
              created_at: order.created_at, agent_name: agentProfile?.full_name || null, rider_name: null,
              flag_type: "Stale Order", flag_detail: `Order stuck in "${order.status}" for ${Math.round(age / 3600000)}h`,
              severity: "high",
            });
          } else if (age > 60 * 60 * 1000 && order.status === "pending") {
            orderFlags.push({
              id: order.id, location_name: order.location_name, status: order.status,
              created_at: order.created_at, agent_name: null, rider_name: null,
              flag_type: "Unaccepted Order", flag_detail: `Pending for ${Math.round(age / 60000)}m — no agent accepted`,
              severity: "medium",
            });
          }
        }

        if (order.status === "delivered" && order.timer_started_at && order.estimated_minutes) {
          const actual = (new Date(order.updated_at).getTime() - new Date(order.timer_started_at).getTime()) / 60000;
          if (actual > order.estimated_minutes * 1.5) {
            const agentProfile = profileMap.get(order.agent_id || "");
            orderFlags.push({
              id: order.id, location_name: order.location_name, status: order.status,
              created_at: order.created_at, agent_name: agentProfile?.full_name || null, rider_name: null,
              flag_type: "Severe Overtime", flag_detail: `Took ${Math.round(actual)}m vs ${order.estimated_minutes}m estimate`,
              severity: "high",
            });
          }
        }
      });

      alerts.forEach(alert => {
        if (alert.status === "accepted" && !alert.rider_arrived_at && alert.rider_id) {
          const age = Date.now() - new Date(alert.created_at).getTime();
          if (age > 60 * 60 * 1000) {
            const riderProfile = profileMap.get(alert.rider_id);
            orderFlags.push({
              id: alert.id, location_name: alert.store_location_name, status: "rider_no_show",
              created_at: alert.created_at, agent_name: null, rider_name: riderProfile?.full_name || null,
              flag_type: "Rider No-Show", flag_detail: `Accepted ${Math.round(age / 60000)}m ago, never arrived`,
              severity: "high",
            });
          }
        }
        if (alert.rider_arrived_at && (!alert.store_latitude || !alert.store_longitude)) {
          const riderProfile = profileMap.get(alert.rider_id || "");
          orderFlags.push({
            id: alert.id, location_name: alert.store_location_name, status: "no_gps",
            created_at: alert.created_at, agent_name: null, rider_name: riderProfile?.full_name || null,
            flag_type: "No GPS Verification", flag_detail: "Arrived without GPS coordinates on file",
            severity: "low",
          });
        }
      });

      const severityOrder = { high: 0, medium: 1, low: 2 };
      orderFlags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      setFlags(orderFlags);

    } catch (error) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ──
  const openWarnDialog = (userId: string, name: string, role: "agent" | "rider", score: number) => {
    setSelectedUser({ id: userId, name, role, score });
    setActionReason("");
    setActionNotes("");
    setActionDialogOpen(true);
  };

  const openSuspendDialog = (userId: string, name: string, role: "agent" | "rider", score: number) => {
    setSelectedUser({ id: userId, name, role, score });
    setActionReason("");
    setActionNotes("");
    setSuspendDialogOpen(true);
  };

  const openReinstateDialog = (userId: string, name: string, role: "agent" | "rider", score: number) => {
    setSelectedUser({ id: userId, name, role, score });
    setActionReason("");
    setActionNotes("");
    setReinstateDialogOpen(true);
  };

  const handleWarn = async () => {
    if (!selectedUser || !actionReason.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("compliance_actions").insert({
        target_user_id: selectedUser.id,
        admin_id: user?.id,
        action_type: "warning",
        reason: actionReason,
        notes: actionNotes || null,
        target_role: selectedUser.role,
        compliance_score: selectedUser.score,
      });
      if (error) throw error;

      // Send warning email (fire-and-forget)
      supabase.from("profiles").select("email").eq("user_id", selectedUser.id).single().then(({ data: p }) => {
        if (p?.email) {
          supabase.functions.invoke("send-notification-email", {
            body: {
              type: "compliance_warning",
              data: {
                email: p.email,
                name: selectedUser.name,
                reason: actionReason,
                notes: actionNotes || undefined,
                role: selectedUser.role,
                score: selectedUser.score,
              },
            },
          }).catch((err) => console.error("Warning email failed:", err));
        }
      });

      toast({ title: "Warning Issued", description: `${selectedUser.name} has been warned.` });
      setActionDialogOpen(false);
      fetchComplianceData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to issue warning", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser || !actionReason.trim()) return;
    setProcessing(true);
    try {
      // Record action
      const { error: actionError } = await supabase.from("compliance_actions").insert({
        target_user_id: selectedUser.id,
        admin_id: user?.id,
        action_type: "suspension",
        reason: actionReason,
        notes: actionNotes || null,
        target_role: selectedUser.role,
        compliance_score: selectedUser.score,
      });
      if (actionError) throw actionError;

      // Suspend application
      await supabase.from("agent_applications")
        .update({ status: "suspended" })
        .eq("user_id", selectedUser.id);

      // Downgrade role to buyer
      await supabase.from("user_roles")
        .update({ role: "buyer" })
        .eq("user_id", selectedUser.id);

      // Send suspension email (fire-and-forget)
      const targetProfile2 = profilesMap[selectedUser.id];
      if (targetProfile2?.email) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "compliance_suspension",
            data: {
              email: targetProfile2.email,
              name: selectedUser.name,
              reason: actionReason,
              notes: actionNotes || undefined,
              role: selectedUser.role,
              score: selectedUser.score,
            },
          },
        }).catch((err) => console.error("Suspension email failed:", err));
      }

      toast({ title: "User Suspended", description: `${selectedUser.name} has been suspended and downgraded to buyer.` });
      setSuspendDialogOpen(false);
      fetchComplianceData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to suspend user", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReinstate = async () => {
    if (!selectedUser || !actionReason.trim()) return;
    setProcessing(true);
    try {
      const { error: actionError } = await supabase.from("compliance_actions").insert({
        target_user_id: selectedUser.id,
        admin_id: user?.id,
        action_type: "reinstatement",
        reason: actionReason,
        notes: actionNotes || null,
        target_role: selectedUser.role,
        compliance_score: selectedUser.score,
      });
      if (actionError) throw actionError;

      // Reinstate application
      await supabase.from("agent_applications")
        .update({ status: "approved" })
        .eq("user_id", selectedUser.id);

      // Restore role
      await supabase.from("user_roles")
        .update({ role: selectedUser.role })
        .eq("user_id", selectedUser.id);

      // Send reinstatement email (fire-and-forget)
      const targetProfile3 = profilesMap[selectedUser.id];
      if (targetProfile3?.email) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "compliance_reinstatement",
            data: {
              email: targetProfile3.email,
              name: selectedUser.name,
              reason: actionReason,
              notes: actionNotes || undefined,
              role: selectedUser.role,
              score: selectedUser.score,
            },
          },
        }).catch((err) => console.error("Reinstatement email failed:", err));
      }

      toast({ title: "User Reinstated", description: `${selectedUser.name} has been reinstated as ${selectedUser.role}.` });
      setReinstateDialogOpen(false);
      fetchComplianceData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reinstate user", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ── Render helpers ──
  const renderActionButtons = (userId: string, name: string | null, role: "agent" | "rider", score: number, isSuspended: boolean) => {
    const displayName = name || "Unknown";
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          onClick={() => openWarnDialog(userId, displayName, role, score)}
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1" />
          Warn
        </Button>
        {isSuspended ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => openReinstateDialog(userId, displayName, role, score)}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reinstate
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:bg-red-50"
            onClick={() => openSuspendDialog(userId, displayName, role, score)}
          >
            <Ban className="w-3.5 h-3.5 mr-1" />
            Suspend
          </Button>
        )}
      </div>
    );
  };

  // ── Summary Stats ──
  const totalAgents = agentData.length;
  const avgAgentScore = totalAgents > 0 ? Math.round(agentData.reduce((s, a) => s + a.compliance_score, 0) / totalAgents) : 0;
  const totalRiders = riderData.length;
  const avgRiderScore = totalRiders > 0 ? Math.round(riderData.reduce((s, r) => s + r.compliance_score, 0) / totalRiders) : 0;
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
            Track efficiency, enforce compliance, warn or suspend underperforming users.
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
              <div className={`text-2xl font-bold ${getScoreColor(avgAgentScore)}`}>{loading ? "—" : `${avgAgentScore}%`}</div>
              <Progress value={avgAgentScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rider Score</CardTitle>
              <Bike className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(avgRiderScore)}`}>{loading ? "—" : `${avgRiderScore}%`}</div>
              <Progress value={avgRiderScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Flags</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{loading ? "—" : highFlags}</div>
              <p className="text-xs text-muted-foreground mt-1">{flags.length} total issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Performers</CardTitle>
              <Activity className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{loading ? "—" : lowPerformers}</div>
              <p className="text-xs text-muted-foreground mt-1">Score below 70%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="flags" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="flags" className="gap-1">
              <AlertTriangle className="w-4 h-4" /> Flags ({flags.length})
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1">
              <UserCheck className="w-4 h-4" /> Agents ({agentData.length})
            </TabsTrigger>
            <TabsTrigger value="riders" className="gap-1">
              <Bike className="w-4 h-4" /> Riders ({riderData.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="w-4 h-4" /> Action Log ({actionHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Flags Tab ── */}
          <TabsContent value="flags">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Flags</CardTitle>
                <CardDescription>Stale orders, overtime, no-shows, missing GPS</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
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
                            <TableCell><Badge variant="outline" className={getSeverityBadge(flag.severity)}>{flag.severity}</Badge></TableCell>
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
                <CardDescription>Response times, on-time rates, and enforcement actions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
                ) : agentData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No agents to display</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead><div className="flex items-center gap-1"><Timer className="w-3 h-3" /> Response</div></TableHead>
                          <TableHead><div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Fulfillment</div></TableHead>
                          <TableHead>On-Time</TableHead>
                          <TableHead>Warnings</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentData.map((agent) => (
                          <TableRow key={agent.user_id} className={agent.is_suspended ? "opacity-60 bg-muted/30" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium">{agent.full_name || "No name"}</p>
                                  <p className="text-xs text-muted-foreground">{agent.email}</p>
                                </div>
                                {agent.is_suspended && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Suspended</Badge>
                                )}
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
                              {agent.warning_count > 0 ? (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  {agent.warning_count}
                                </Badge>
                              ) : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell>
                              <Badge className={getScoreBg(agent.compliance_score)}>{agent.compliance_score}%</Badge>
                            </TableCell>
                            <TableCell>
                              {renderActionButtons(agent.user_id, agent.full_name, "agent", agent.compliance_score, agent.is_suspended)}
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
                <CardDescription>Arrival times, GPS verification, and enforcement actions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
                ) : riderData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No riders to display</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rider</TableHead>
                          <TableHead>Pickups</TableHead>
                          <TableHead><div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Arrival</div></TableHead>
                          <TableHead><div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS</div></TableHead>
                          <TableHead>No-Shows</TableHead>
                          <TableHead>Warnings</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riderData.map((rider) => (
                          <TableRow key={rider.user_id} className={rider.is_suspended ? "opacity-60 bg-muted/30" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium">{rider.full_name || "No name"}</p>
                                  <p className="text-xs text-muted-foreground">{rider.email}</p>
                                </div>
                                {rider.is_suspended && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Suspended</Badge>
                                )}
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
                              <div className="flex items-center gap-2">
                                <Progress value={rider.gps_verification_rate} className="w-16 h-2" />
                                <span className="text-sm">{rider.gps_verification_rate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rider.no_show_count > 0 ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <XCircle className="w-3 h-3 mr-1" />{rider.no_show_count}
                                </Badge>
                              ) : <span className="text-green-600">0</span>}
                            </TableCell>
                            <TableCell>
                              {rider.warning_count > 0 ? (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  {rider.warning_count}
                                </Badge>
                              ) : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell>
                              <Badge className={getScoreBg(rider.compliance_score)}>{rider.compliance_score}%</Badge>
                            </TableCell>
                            <TableCell>
                              {renderActionButtons(rider.user_id, rider.full_name, "rider", rider.compliance_score, rider.is_suspended)}
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

          {/* ── Action History Tab ── */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Enforcement Action Log</CardTitle>
                <CardDescription>Complete history of warnings, suspensions, and reinstatements</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
                ) : actionHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">No Actions Yet</p>
                    <p className="text-muted-foreground">Enforcement actions will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actionHistory.map((action) => (
                          <TableRow key={action.id}>
                            <TableCell className="text-sm">{new Date(action.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                action.action_type === "warning" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                action.action_type === "suspension" ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-green-50 text-green-700 border-green-200"
                              }>
                                {action.action_type === "warning" && <MessageSquare className="w-3 h-3 mr-1" />}
                                {action.action_type === "suspension" && <Ban className="w-3 h-3 mr-1" />}
                                {action.action_type === "reinstatement" && <RotateCcw className="w-3 h-3 mr-1" />}
                                {action.action_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{action.target_name}</TableCell>
                            <TableCell className="capitalize">{action.target_role}</TableCell>
                            <TableCell>{action.compliance_score !== null ? `${action.compliance_score}%` : "—"}</TableCell>
                            <TableCell className="max-w-xs text-sm text-muted-foreground">{action.reason}</TableCell>
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

      {/* ── Warning Dialog ── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Issue Warning
            </DialogTitle>
            <DialogDescription>
              Warn <span className="font-medium text-foreground">{selectedUser?.name}</span> ({selectedUser?.role}) — Current score: {selectedUser?.score}%
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Reason *</label>
              <Select value={actionReason} onValueChange={setActionReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low compliance score">Low compliance score</SelectItem>
                  <SelectItem value="Excessive overtime deliveries">Excessive overtime deliveries</SelectItem>
                  <SelectItem value="Slow response to orders">Slow response to orders</SelectItem>
                  <SelectItem value="GPS verification failures">GPS verification failures</SelectItem>
                  <SelectItem value="Rider no-show incidents">Rider no-show incidents</SelectItem>
                  <SelectItem value="High order cancellation rate">High order cancellation rate</SelectItem>
                  <SelectItem value="Customer complaints">Customer complaints</SelectItem>
                  <SelectItem value="Policy violation">Policy violation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Additional Notes</label>
              <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Optional details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWarn} disabled={!actionReason.trim() || processing} className="bg-orange-600 hover:bg-orange-700 text-white">
              {processing ? "Sending..." : "Issue Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suspend Dialog ── */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Suspend {selectedUser?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke their {selectedUser?.role} access and downgrade them to buyer. 
              They won't be able to accept orders or pickups until reinstated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Reason *</label>
              <Select value={actionReason} onValueChange={setActionReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critically low compliance score">Critically low compliance score</SelectItem>
                  <SelectItem value="Repeated warnings ignored">Repeated warnings ignored</SelectItem>
                  <SelectItem value="Multiple no-show incidents">Multiple no-show incidents</SelectItem>
                  <SelectItem value="Fraud or misconduct">Fraud or misconduct</SelectItem>
                  <SelectItem value="Customer safety concern">Customer safety concern</SelectItem>
                  <SelectItem value="Repeated GPS verification failures">Repeated GPS verification failures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Optional details..." />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={!actionReason.trim() || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? "Suspending..." : "Confirm Suspension"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reinstate Dialog ── */}
      <Dialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-green-600" />
              Reinstate {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Restore their {selectedUser?.role} role and allow them to resume operations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Reason *</label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Why is this user being reinstated?"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Conditions or expectations..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReinstateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReinstate} disabled={!actionReason.trim() || processing} className="bg-green-600 hover:bg-green-700 text-white">
              {processing ? "Reinstating..." : "Confirm Reinstatement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminCompliance;
