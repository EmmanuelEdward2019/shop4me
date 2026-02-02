import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, TrendingUp, Package, Wallet } from "lucide-react";

interface AgentWithStats {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  completed_orders: number;
  total_earnings: number;
  pending_earnings: number;
}

const AdminAgents = () => {
  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // Get all agents
      const { data: agentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent");

      if (rolesError) throw rolesError;

      if (!agentRoles || agentRoles.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      const agentIds = agentRoles.map((r) => r.user_id);

      // Fetch profiles, orders, and earnings in parallel
      const [profilesResult, ordersResult, earningsResult] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", agentIds),
        supabase.from("orders").select("agent_id, status").in("agent_id", agentIds),
        supabase.from("agent_earnings").select("agent_id, amount, status").in("agent_id", agentIds),
      ]);

      const profiles = profilesResult.data || [];
      const orders = ordersResult.data || [];
      const earnings = earningsResult.data || [];

      const agentsWithStats: AgentWithStats[] = profiles.map((profile) => {
        const agentOrders = orders.filter((o) => o.agent_id === profile.user_id);
        const completedOrders = agentOrders.filter((o) => o.status === "delivered").length;

        const agentEarnings = earnings.filter((e) => e.agent_id === profile.user_id);
        const totalEarnings = agentEarnings
          .filter((e) => e.status === "paid")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const pendingEarnings = agentEarnings
          .filter((e) => e.status === "pending")
          .reduce((sum, e) => sum + Number(e.amount), 0);

        return {
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          created_at: profile.created_at,
          completed_orders: completedOrders,
          total_earnings: totalEarnings,
          pending_earnings: pendingEarnings,
        };
      });

      setAgents(agentsWithStats);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const filteredAgents = agents.filter((agent) => {
    return (
      agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.phone?.includes(searchQuery)
    );
  });

  // Calculate summary stats
  const totalAgents = agents.length;
  const totalCompletedOrders = agents.reduce((sum, a) => sum + a.completed_orders, 0);
  const totalPaidEarnings = agents.reduce((sum, a) => sum + a.total_earnings, 0);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agent Management</h1>
          <p className="text-muted-foreground">View agent performance and earnings.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Agents
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAgents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Deliveries
              </CardTitle>
              <Package className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCompletedOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Paid Earnings
              </CardTitle>
              <Wallet className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPaidEarnings)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Agents</CardTitle>
            <CardDescription>
              {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
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

            {/* Agents Table */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No agents found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Completed Orders</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Pending Earnings</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{agent.full_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{agent.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{agent.phone || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {agent.completed_orders}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(agent.total_earnings)}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {formatCurrency(agent.pending_earnings)}
                        </TableCell>
                        <TableCell>
                          {new Date(agent.created_at).toLocaleDateString()}
                        </TableCell>
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

export default AdminAgents;
